// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::Command;
use std::path::Path;
use base64::{Engine, prelude::BASE64_STANDARD};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_thumbnail(
    video_path: String, 
    image_path: Option<String>, 
    image_data: Option<String>,
    save_mode: String,
    output_filename: Option<String>
) -> Result<String, String> {
    let video_path_obj = Path::new(&video_path);
    let parent = video_path_obj.parent().unwrap_or(Path::new(""));
    let file_stem = video_path_obj.file_stem().unwrap_or_default().to_string_lossy();
    let extension = video_path_obj.extension().unwrap_or_default().to_string_lossy();
    
    // Determine the image path to use
    let temp_image_path;
    let final_image_path_str = if let Some(data) = image_data {
        // Decode base64 image data
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        let base64_str = if let Some(comma_index) = data.find(',') {
            &data[comma_index + 1..]
        } else {
            &data
        };

        let decoded_data = BASE64_STANDARD.decode(base64_str)
            .map_err(|e| format!("Failed to decode base64 image data: {}", e))?;

        // Create a temporary file
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join(format!("thumb_{}.png", file_stem));
        std::fs::write(&temp_file_path, decoded_data)
            .map_err(|e| format!("Failed to write temporary image file: {}", e))?;
        
        temp_image_path = Some(temp_file_path.clone());
        temp_file_path.to_string_lossy().to_string()
    } else if let Some(path) = image_path {
        temp_image_path = None;
        path
    } else {
        return Err("No image source provided (file path or captured data).".to_string());
    };

    // Determine output path based on save mode
    let output_path;
    let is_overwrite = save_mode == "overwrite";
    
    if is_overwrite {
        // Use a temporary file initially, will overwrite original later
        let temp_output = parent.join(format!("{}_temp.{}", file_stem, extension));
        output_path = temp_output;
    } else {
        // Save as new file
        let output_filename_str = if let Some(name) = output_filename {
            if name.trim().is_empty() {
                format!("{}_thumb", file_stem)
            } else {
                name
            }
        } else {
            format!("{}_thumb", file_stem)
        };
        output_path = parent.join(format!("{}.{}", output_filename_str, extension));
    }
    
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
        .arg(&final_image_path_str)
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
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e));

    // Cleanup temporary image file if it was created
    if let Some(path) = temp_image_path {
        let _ = std::fs::remove_file(path);
    }

    let output = output?;

    if output.status.success() {
        // If overwrite mode, replace original file with the temporary output
        if is_overwrite {
            std::fs::remove_file(&video_path)
                .map_err(|e| format!("Failed to delete original file: {}", e))?;
            std::fs::rename(&output_path, &video_path)
                .map_err(|e| format!("Failed to overwrite original file: {}", e))?;
            Ok(format!("Thumbnail set successfully!\n\nOriginal file has been updated:\n{}", video_path))
        } else {
            Ok(format!("Thumbnail set successfully!\n\nOutput saved to:\n{}", output_path_str))
        }
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
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, set_thumbnail])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
