// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::Command;
use std::path::Path;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_thumbnail(video_path: String, image_path: String) -> Result<String, String> {
    let video_path_obj = Path::new(&video_path);
    let parent = video_path_obj.parent().unwrap_or(Path::new(""));
    let file_stem = video_path_obj.file_stem().unwrap_or_default().to_string_lossy();
    let extension = video_path_obj.extension().unwrap_or_default().to_string_lossy();
    
    // Create output filename: [filename]_thumb.[ext]
    let output_filename = format!("{}_thumb.{}", file_stem, extension);
    let output_path = parent.join(output_filename);
    let output_path_str = output_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    
    let mut cmd = Command::new("ffmpeg");
    
    // Hide console window on Windows
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
        .arg("-i")
        .arg(&video_path)
        .arg("-i")
        .arg(&image_path)
        .arg("-map")
        .arg("1")
        .arg("-map")
        .arg("0")
        .arg("-c")
        .arg("copy")
        .arg("-disposition:0")
        .arg("attached_pic")
        .arg(&output_path_str)
        .arg("-y") // Overwrite if exists
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if output.status.success() {
        Ok(format!("Thumbnail set successfully!\n\nOutput saved to:\n{}", output_path_str))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg Error:\n{}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, set_thumbnail])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
