// Prevents an extra console window from opening in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    bugrush_lib::run()
}
