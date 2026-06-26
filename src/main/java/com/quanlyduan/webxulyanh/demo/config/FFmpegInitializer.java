package com.quanlyduan.webxulyanh.demo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;

@Configuration
public class FFmpegInitializer {

    private static final Logger logger = LoggerFactory.getLogger(FFmpegInitializer.class);

    @PostConstruct
    public void init() {
        File ffmpeg = new File("bin/ffmpeg.exe");
        File ffprobe = new File("bin/ffprobe.exe");
        File script = new File("bin/download_ffmpeg.ps1");

        if ((!ffmpeg.exists() || !ffprobe.exists()) && script.exists()) {
            logger.info("FFmpeg binaries not found in 'bin/'. Starting download script...");
            try {
                ProcessBuilder processBuilder = new ProcessBuilder(
                        "powershell.exe",
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-File",
                        script.getAbsolutePath()
                );
                
                // Inherit IO so the download progress and logs are printed to the console
                processBuilder.inheritIO();
                
                Process process = processBuilder.start();
                int exitCode = process.waitFor();
                
                if (exitCode == 0) {
                    logger.info("FFmpeg binaries downloaded successfully.");
                } else {
                    logger.error("Failed to download FFmpeg binaries. Script exited with code: {}", exitCode);
                }
            } catch (IOException | InterruptedException e) {
                logger.error("Error occurred while trying to run the download script", e);
                Thread.currentThread().interrupt();
            }
        } else if (!ffmpeg.exists() && !script.exists()) {
            logger.warn("FFmpeg binaries not found, and download script 'bin/download_ffmpeg.ps1' is also missing.");
        } else {
            logger.info("FFmpeg binaries are already present.");
        }
    }
}
