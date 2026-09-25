//
// SQLite persistence layer.
//
// This module will say as a thin, generic I/O layer on purpose: db_select/db_execute
//  take raw SQL + params from the frontend and hand back generic JSON-shaped results.
//
// Which queries get run and what the rows mean is TypeScript's job, not this file's.
//

use rusqlite::types::{Type as SqlType, Value as SqlValue, ValueRef};
use rusqlite::{Connection, Error as SqlError};
use serde::Serialize;
use serde_json::Value as JsonValue;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const DB_FILE_NAME: &str = "mindsparks.db"; // I don't know how to name it, so project name it is.

// None until the vault resolves to VaultState::Ready.
pub type DbState = Mutex<Option<Connection>>;

// Ordered migrations, tracked by schema_migrations below.
// Never edit an already-shipped entry, only append new ones.
const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../migrations/001_create_spaces.sql")),
    (2, include_str!("../migrations/002_create_sparks_flames_&_categories.sql")),
    (3, include_str!("../migrations/003_create_connections.sql")),
];

fn run_migrations(conn: &mut Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)",
        (),
    )
    .map_err(|e| format!("Couldn't create schema_migrations: {e}"))?;

    let mut applied_stmt = conn
        .prepare("SELECT version FROM schema_migrations")
        .map_err(|e| format!("Couldn't read schema_migrations: {e}"))?;

    let applied: Vec<i64> = applied_stmt
        .query_map([], |row| row.get(0))
        .and_then(Iterator::collect)
        .map_err(|e| format!("Couldn't read applied migrations: {e}"))?;

    drop(applied_stmt);

    for (version, sql) in MIGRATIONS {
        if applied.contains(version) {
            continue;
        }

        let tx = conn.transaction()
            .map_err(|e| format!("Couldn't start migration {version}: {e}"))?;

        tx.execute_batch(sql)
            .map_err(|e| format!("Migration {version} failed: {e}"))?;

        tx.execute(
            "INSERT INTO schema_migrations (version) VALUES (?1)",
            (version,),
        )
        .map_err(|e| format!("Couldn't record migration {version}: {e}"))?;

        tx.commit()
            .map_err(|e| format!("Couldn't commit migration {version}: {e}"))?;
    }
    
    Ok(())
}

// Opens (or re-opens) the connection to [vault]/[db_name].db, runs any
// pending migrations, and stores it as managed state.
// Called once the vault resolves to Ready from lib.rs on setup() and from vault::set_vault_path
pub fn open_connection(app: &AppHandle, vault_path: &Path) -> Result<(), String> {
    let db_path = vault_path.join(DB_FILE_NAME);
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Couldn't open database at {} : {e}", db_path.display()))?;

    conn.execute("PRAGMA foreign_keys = ON", ())
        .map_err(|e| format!("Couldn't enable foreign keys: {e}"))?;

    run_migrations(&mut conn)?;

    let state = app.state::<DbState>();
    *state.lock()
        .map_err(|_| "Database state lock poisoned".to_string())? = Some(conn);

    Ok(())
}

// --------------------------
// Generic value marshalling
// --------------------------

// https://www.sqlite.org/datatype3.html#boolean_datatype
fn json_to_sql_param(value: &JsonValue) -> Result<SqlValue, String> {
    Ok(match value {
        JsonValue::Null => SqlValue::Null,
        JsonValue::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
        JsonValue::Number(n) => match(n.as_i64(), n.as_f64()) {
            (Some(i), _) => SqlValue::Integer(i),
            (None, Some(f)) => SqlValue::Real(f),
            (None, None) => return Err(format!("Unsupported number: {n}")),
        },
        JsonValue::String(s) => SqlValue::Text(s.clone()),
        JsonValue::Array(_) | JsonValue::Object(_) => {
            return Err("Arrays/objects as params must be JSON.stringify'd first".into());
        }
    })
}

fn json_params_to_sql(params: &[JsonValue]) -> Result<Vec<SqlValue>, String> {
    params.iter().map(json_to_sql_param).collect()
}

// rusqlite column value -> serde_json::Value, for sending rows back to the frontend.
// No BLOB columns for now, so I'll leave the case as an error instead of guessing.
fn sql_value_to_json(
    index: usize,
    name: &str,
    value: ValueRef,
) -> rusqlite::Result<JsonValue> {
    match value {
        ValueRef::Null => Ok(JsonValue::Null),
        ValueRef::Integer(i) => Ok(JsonValue::from(i)),
        ValueRef::Real(f) => Ok(JsonValue::from(f)),
        ValueRef::Text(t) => {
            let text = String::from_utf8(t.to_vec())
                .map_err(|_| {
                    SqlError::InvalidColumnType(
                        index,
                        name.to_string(),
                        SqlType::Text,
                    )
                })?;

            Ok(JsonValue::String(text))
        }
        ValueRef::Blob(_) => Err(SqlError::InvalidColumnType(
            index,
            name.to_string(),
            SqlType::Blob,
        )),
    }
}

// --------------------------
// Commands
// --------------------------

#[derive(Serialize)]
pub struct DbExecuteResult {
    #[serde(rename = "rowsAffected")]
    rows_affected: usize,
    #[serde(rename = "lastInsertId")]
    last_insert_id: i64,
}

#[tauri::command]
pub fn db_select(
    app: AppHandle,
    query: String,
    params: Vec<JsonValue>,
) -> Result<Vec<JsonValue>, String> {
    let state = app.state::<DbState>();
    let guard = state
        .lock()
        .map_err(|_| "Database state lock poisoned".to_string())?;
    let conn = guard.as_ref().ok_or("No database connection is open yet")?;

    let sql_params = json_params_to_sql(&params)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> =
        sql_params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

    let mut stmt = conn.prepare(&query).map_err(|e| format!("Invalid query: {e}"))?;
    let column_names: Vec<String> = stmt.column_names().into_iter().map(String::from).collect();

    stmt.query_map(param_refs.as_slice(), |row| {
        let mut obj = serde_json::Map::new();
        for (i, name) in column_names.iter().enumerate() {
            obj.insert(name.clone(), sql_value_to_json(i, name, row.get_ref(i)?)?);
        }
        Ok(JsonValue::Object(obj))
    })
    .and_then(Iterator::collect)
    .map_err(|e| format!("Query failed: {e}"))
}

#[tauri::command]
pub fn db_execute(
    app: AppHandle,
    query: String,
    params: Vec<JsonValue>,
) -> Result<DbExecuteResult, String> {
    let state = app.state::<DbState>();
    let guard = state
        .lock()
        .map_err(|_| "Database state lock poisoned".to_string())?;
    let conn = guard.as_ref().ok_or("No database connection is open yet")?;

    let sql_params = json_params_to_sql(&params)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = sql_params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

    let rows_affected = conn
        .execute(&query, param_refs.as_slice())
        .map_err(|e| format!("Query failed: {e}"))?;

    Ok(DbExecuteResult {
        rows_affected,
        last_insert_id: conn.last_insert_rowid(),
    })
}
