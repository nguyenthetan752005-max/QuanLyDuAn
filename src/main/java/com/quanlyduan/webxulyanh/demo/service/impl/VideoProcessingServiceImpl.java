package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.entity.ProjectProcessing;
import com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus;
import com.quanlyduan.webxulyanh.demo.enums.ProcessingType;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.ProjectProcessingRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.service.VideoProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class VideoProcessingServiceImpl implements VideoProcessingService {

    private final ProjectRepository projectRepository;
    private final ProjectProcessingRepository projectProcessingRepository;
    private final com.quanlyduan.webxulyanh.demo.service.ProjectProcessingService projectProcessingService;

    private final ExecutorService renderExecutor = Executors.newFixedThreadPool(2);
    private final Map<String, Future<?>> activeFutures = new ConcurrentHashMap<>();
    private final Map<String, Process> activeProcesses = new ConcurrentHashMap<>();

    @Value("${app.ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${app.ffprobe.path:ffprobe}")
    private String ffprobePath;

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public ProjectProcessingResponseDTO startVideoRender(String projectId, String format, Double scale, Integer fps, String userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        // Create ProjectProcessing entry
        ProjectProcessing processing = ProjectProcessing.builder()
                .projectId(projectId)
                .userId(userId)
                .status(ProcessingStatus.QUEUED)
                .processingType(ProcessingType.PROJECT_EXPORT)
                .progressPercent(0)
                .createdAt(LocalDateTime.now())
                .build();
        ProjectProcessing saved = projectProcessingRepository.save(processing);

        // Start render asynchronously
        Future<?> future = renderExecutor.submit(() -> performRender(project, saved, format, scale, fps));
        activeFutures.put(saved.getId(), future);

        return mapToResponse(saved);
    }

    private void performRender(Project project, ProjectProcessing processing, String format, Double scale, Integer fps) {
        processing.setStatus(ProcessingStatus.RUNNING);
        processing.setStartedAt(LocalDateTime.now());
        projectProcessingRepository.save(processing);

        List<File> tempFiles = new ArrayList<>();

        try {
            Map<String, Object> canvasData = project.getCanvasData();
            Map<String, Object> timelineData = project.getTimelineData();

            if (canvasData == null || timelineData == null) {
                throw new RuntimeException("Dữ liệu canvasData hoặc timelineData không hợp lệ.");
            }

            Map<String, Object> projectConfig = (Map<String, Object>) canvasData.get("projectConfig");
            int width = ((Number) projectConfig.getOrDefault("width", 800)).intValue();
            int height = ((Number) projectConfig.getOrDefault("height", 600)).intValue();
            String background = (String) projectConfig.getOrDefault("background", "#ffffff");
            double totalTime = ((Number) timelineData.getOrDefault("totalTime", 0.0)).doubleValue();
            if (totalTime <= 0.0) {
                throw new RuntimeException("Thời lượng video phải lớn hơn 0 để thực hiện xuất video.");
            }
            List<Map<String, Object>> clips = (List<Map<String, Object>>) timelineData.get("clips");
            List<Map<String, Object>> canvasItems = (List<Map<String, Object>>) canvasData.get("canvasItems");
            List<Map<String, Object>> tabs = (List<Map<String, Object>>) canvasData.get("tabs");

            if (clips == null) clips = new ArrayList<>();
            if (canvasItems == null) canvasItems = new ArrayList<>();
            if (tabs == null) tabs = new ArrayList<>();

            // 1. Build FFmpeg command input list
            List<String> command = new ArrayList<>();
            command.add(ffmpegPath);
            command.add("-nostdin"); // Ngăn ffmpeg đòi đọc stdin gây kẹt process
            command.add("-y"); // overwrite output

            // Input 0: Background video stream of duration totalTime
            String hexColor = background.startsWith("#") ? "0x" + background.substring(1) : "0xffffff";
            if (background.equalsIgnoreCase("transparent")) {
                hexColor = "0x000000"; // default black for transparent background in video
            }
            int outW = (int) Math.round(width * scale);
            int outH = (int) Math.round(height * scale);
            // Ensure dimensions are divisible by 2 for h264 encoder compatibility
            if (outW % 2 != 0) outW++;
            if (outH % 2 != 0) outH++;

            command.add("-f");
            command.add("lavfi");
            command.add("-i");
            command.add(String.format("color=c=%s:s=%dx%d:d=%f:r=%d", hexColor, outW, outH, totalTime, fps));

            // Map inputs
            Map<String, Integer> clipIdToInputIndex = new HashMap<>();
            int currentInputIndex = 1;

            for (Map<String, Object> clip : clips) {
                String clipId = (String) clip.get("id");
                Map<String, Object> item = canvasItems.stream()
                        .filter(i -> clipId.equals(i.get("instanceId")))
                        .findFirst()
                        .orElse(null);

                if (item == null || "text".equals(item.get("type")) || "sticker".equals(item.get("type")) || "shape".equals(item.get("type"))) {
                    continue; // Text, stickers and shapes have no source file input
                }

                String tabId = (String) item.get("tabId");
                if (tabId == null) {
                    continue;
                }
                Map<String, Object> tab = tabs.stream()
                        .filter(t -> tabId.equals(t.get("id")))
                        .findFirst()
                        .orElse(null);

                if (tab == null) continue;

                String url = (String) tab.get("url");
                String inputPath = resolvePath(url);

                command.add("-i");
                command.add(inputPath);
                clipIdToInputIndex.put(clipId, currentInputIndex);
                currentInputIndex++;
            }

            List<Map<String, Object>> tracks = (List<Map<String, Object>>) timelineData.get("tracks");
            if (tracks == null) tracks = new ArrayList<>();

            Map<String, Integer> trackIdToIndex = new HashMap<>();
            Map<String, String> trackIdToType = new HashMap<>();
            for (int i = 0; i < tracks.size(); i++) {
                Map<String, Object> track = tracks.get(i);
                if (track != null && track.get("id") != null) {
                    String tId = track.get("id").toString();
                    trackIdToIndex.put(tId, i);
                    trackIdToType.put(tId, (String) track.getOrDefault("type", "video"));
                }
            }

            // Sort clips by track index in descending order so that bottom tracks are rendered first
            // and top tracks are rendered last (overlayed on top of lower tracks)
            List<Map<String, Object>> sortedClips = new ArrayList<>(clips);
            sortedClips.sort((clip1, clip2) -> {
                String trackId1 = (String) clip1.get("trackId");
                String trackId2 = (String) clip2.get("trackId");
                int index1 = trackIdToIndex.getOrDefault(trackId1, 999);
                int index2 = trackIdToIndex.getOrDefault(trackId2, 999);
                return Integer.compare(index2, index1); // descending
            });

            List<String> filterSegments = new ArrayList<>();
            List<String> audioStreams = new ArrayList<>();
            String currentBg = "[0:v]";

            int renderItemIndex = 1;
            for (Map<String, Object> clip : sortedClips) {
                String clipId = (String) clip.get("id");
                double startOffset = ((Number) clip.getOrDefault("startOffset", 0.0)).doubleValue();
                double duration = ((Number) clip.getOrDefault("duration", 5.0)).doubleValue();
                double trimStart = ((Number) clip.getOrDefault("trimStart", 0.0)).doubleValue();
                // Per-clip audio volume (US10). 100 = giữ nguyên. Locale.US để tránh dấu phẩy thập phân.
                double volume = ((Number) clip.getOrDefault("volume", 100)).doubleValue() / 100.0;
                String volStr = String.format(java.util.Locale.US, "%.4f", volume);

                Map<String, Object> item = canvasItems.stream()
                        .filter(i -> clipId.equals(i.get("instanceId")))
                        .findFirst()
                        .orElse(null);

                if (item == null) continue;

                String trackId = (String) clip.get("trackId");
                String trackType = trackIdToType.getOrDefault(trackId, "video");
                boolean isAudioTrack = "audio".equals(trackType);

                final String currentTrackId = trackId;
                Map<String, Object> trackMap = tracks.stream()
                        .filter(t -> currentTrackId.equals(t.get("id")))
                        .findFirst()
                        .orElse(null);
                boolean isTrackHidden = trackMap != null && Boolean.TRUE.equals(trackMap.get("hidden"));
                boolean isTrackMuted = trackMap != null && Boolean.TRUE.equals(trackMap.get("muted"));

                // Handle Audio-only track (skip video overlay, extract audio only)
                if (isAudioTrack) {
                    if (isTrackMuted) {
                        continue; // Skip entirely if muted
                    }
                    Integer inputIdx = clipIdToInputIndex.get(clipId);
                    if (inputIdx == null) continue;

                    String tabId = (String) item.get("tabId");
                    if (tabId == null) {
                        continue;
                    }
                    Map<String, Object> tab = tabs.stream()
                            .filter(t -> tabId.equals(t.get("id")))
                            .findFirst()
                            .orElse(null);
                    String url = tab != null ? (String) tab.get("url") : "";
                    String fullInputPath = resolvePath(url);

                    String audioLabel = "[a_delayed_" + renderItemIndex + "]";
                    long delayMs = Math.round(startOffset * 1000);
                    filterSegments.add(String.format(
                            "[%d:a]atrim=%f:%f,asetpts=PTS-STARTPTS,volume=%s,adelay=%d|%d%s",
                            inputIdx, trimStart, trimStart + duration, volStr, delayMs, delayMs, audioLabel
                    ));
                    audioStreams.add(audioLabel);
                    renderItemIndex++;
                    continue;
                }

                // Handle hidden track (skip video overlay, extract audio if not muted)
                if (isTrackHidden) {
                    if (!isTrackMuted) {
                        Integer inputIdx = clipIdToInputIndex.get(clipId);
                        if (inputIdx != null) {
                            String tabId = (String) item.get("tabId");
                            if (tabId == null) {
                                continue;
                            }
                            Map<String, Object> tab = tabs.stream()
                                    .filter(t -> tabId.equals(t.get("id")))
                                    .findFirst()
                                    .orElse(null);
                            String url = tab != null ? (String) tab.get("url") : "";
                            if (isVideoFile(url)) {
                                String fullInputPath = resolvePath(url);
                                if (hasAudioStream(fullInputPath)) {
                                    String audioLabel = "[a_delayed_" + renderItemIndex + "]";
                                    long delayMs = Math.round(startOffset * 1000);
                                    filterSegments.add(String.format(
                                            "[%d:a]atrim=%f:%f,asetpts=PTS-STARTPTS,volume=%s,adelay=%d|%d%s",
                                            inputIdx, trimStart, trimStart + duration, volStr, delayMs, delayMs, audioLabel
                                    ));
                                    audioStreams.add(audioLabel);
                                    renderItemIndex++;
                                }
                            }
                        }
                    }
                    continue;
                }

                String type = (String) item.get("type");
                int x = (int) Math.round(((Number) item.getOrDefault("x", 0)).doubleValue() * scale);
                int y = (int) Math.round(((Number) item.getOrDefault("y", 0)).doubleValue() * scale);
                int w = (int) Math.round(((Number) item.getOrDefault("width", 300)).doubleValue() * scale);
                int h = (int) Math.round(((Number) item.getOrDefault("height", 200)).doubleValue() * scale);

                if (w % 2 != 0) w++;
                if (h % 2 != 0) h++;

                if ("text".equals(type) || "sticker".equals(type)) {
                    // Render Text or Emoji using drawtext filter
                    String text = "";
                    if ("text".equals(type)) {
                        text = (String) item.getOrDefault("text", "");
                    } else {
                        text = (String) item.getOrDefault("sticker", "❤️");
                    }
                    String color = (String) item.getOrDefault("color", "#ffffff");
                    int fontSize = (int) Math.round(((Number) item.getOrDefault("fontSize", 28)).doubleValue() * scale);

                    // Write text to temp file to avoid parsing errors
                    File textFile = File.createTempFile("ffmpeg-text-", ".txt");
                    Files.write(textFile.toPath(), text.getBytes(StandardCharsets.UTF_8));
                    tempFiles.add(textFile);

                    String textFilePath = formatPathForFilter(textFile.getAbsolutePath());
                    String escapedColor = color.startsWith("#") ? "0x" + color.substring(1) : color;

                    // Centered inside text box formula
                    String xExpr = String.format("%d+(%d-tw)/2", x, w);
                    String yExpr = String.format("%d+(%d-th)/2", y, h);

                    String fontFile = "C\\:/Windows/Fonts/arial.ttf";
                    if ("sticker".equals(type)) {
                        fontFile = "C\\:/Windows/Fonts/seguiemj.ttf"; // Segoe UI Emoji for Windows emojis
                    }

                    String nextBg = "[v_text_" + renderItemIndex + "]";
                    filterSegments.add(String.format(
                            "%sdrawtext=textfile='%s':x='%s':y='%s':fontsize=%d:fontcolor=%s:fontfile='%s':enable='between(t,%f,%f)'%s",
                            currentBg, textFilePath, xExpr, yExpr, fontSize, escapedColor, fontFile, startOffset, startOffset + duration, nextBg
                    ));
                    currentBg = nextBg;
                } else if ("shape".equals(type)) {
                    // Render Shapes using drawbox filter
                    String fillColor = (String) item.getOrDefault("fillColor", "#BB86FC");
                    String escapedColor = fillColor.startsWith("#") ? "0x" + fillColor.substring(1) : fillColor;
                    String nextBg = "[v_shape_" + renderItemIndex + "]";
                    filterSegments.add(String.format(
                            "%sdrawbox=x=%d:y=%d:w=%d:h=%d:color=%s:t=fill:enable='between(t,%f,%f)'%s",
                            currentBg, x, y, w, h, escapedColor, startOffset, startOffset + duration, nextBg
                    ));
                    currentBg = nextBg;
                } else {
                    // Video or Image
                    Integer inputIdx = clipIdToInputIndex.get(clipId);
                    if (inputIdx == null) continue;

                    String tabId = (String) item.get("tabId");
                    if (tabId == null) {
                        continue;
                    }
                    Map<String, Object> tab = tabs.stream()
                            .filter(t -> tabId.equals(t.get("id")))
                            .findFirst()
                            .orElse(null);
                    String url = tab != null ? (String) tab.get("url") : "";

                    boolean isVideo = isVideoFile(url);
                    String nextBg = "[v_out_" + renderItemIndex + "]";
                    // Color filters (B4) — empty string when the clip uses default filters,
                    // so existing exports render exactly as before.
                    String colorFilters = buildColorFilterChain(item, scale);

                    if (isVideo) {
                        // Video trimming, scaling, color filters and PTS shifting
                        String ptsLabel = "[pts_v_" + renderItemIndex + "]";
                        filterSegments.add(String.format(
                                "[%d:v]trim=%f:%f,scale=%d:%d%s,setpts=PTS-STARTPTS+%f/TB%s",
                                inputIdx, trimStart, trimStart + duration, w, h, colorFilters, startOffset, ptsLabel
                        ));

                        filterSegments.add(String.format(
                                "%s%soverlay=x=%d:y=%d:enable='between(t,%f,%f)'%s",
                                currentBg, ptsLabel, x, y, startOffset, startOffset + duration, nextBg
                        ));

                        // Handle Audio
                        if (!isTrackMuted) {
                            String fullInputPath = resolvePath(url);
                            if (hasAudioStream(fullInputPath)) {
                                String audioLabel = "[a_delayed_" + renderItemIndex + "]";
                                long delayMs = Math.round(startOffset * 1000);
                                filterSegments.add(String.format(
                                        "[%d:a]atrim=%f:%f,asetpts=PTS-STARTPTS,volume=%s,adelay=%d|%d%s",
                                        inputIdx, trimStart, trimStart + duration, volStr, delayMs, delayMs, audioLabel
                                ));
                                audioStreams.add(audioLabel);
                            }
                        }
                    } else {
                        // Static Image scaling, color filters and overlay
                        String scaledLabel = "[scaled_i_" + renderItemIndex + "]";
                        filterSegments.add(String.format("[%d:v]scale=%d:%d%s%s", inputIdx, w, h, colorFilters, scaledLabel));

                        filterSegments.add(String.format(
                                "%s%soverlay=x=%d:y=%d:enable='between(t,%f,%f)'%s",
                                currentBg, scaledLabel, x, y, startOffset, startOffset + duration, nextBg
                        ));
                    }
                    currentBg = nextBg;
                }
                renderItemIndex++;
            }

            // Audio mixing if any
            if (!audioStreams.isEmpty()) {
                StringBuilder audioFilter = new StringBuilder();
                for (String stream : audioStreams) {
                    audioFilter.append(stream);
                }
                audioFilter.append(String.format("amix=inputs=%d[a_final]", audioStreams.size()));
                filterSegments.add(audioFilter.toString());
            }

            if (!filterSegments.isEmpty()) {
                command.add("-filter_complex");
                command.add(String.join(";\n", filterSegments));
                
                command.add("-map");
                command.add(currentBg);
                if (!audioStreams.isEmpty()) {
                    command.add("-map");
                    command.add("[a_final]");
                }
            } else {
                command.add("-map");
                command.add("0:v");
            }

            // Output settings
            String outputFilename = "video-" + System.currentTimeMillis() + "." + format;
            File uploadFolder = new File(uploadDir).getAbsoluteFile();
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }
            File outputFile = new File(uploadFolder, outputFilename);
            if ("webm".equalsIgnoreCase(format)) {
                command.add("-c:v");
                command.add("libvpx-vp9");
                command.add("-deadline");
                command.add("realtime");
                command.add("-cpu-used");
                command.add("4");
                command.add("-pix_fmt");
                command.add("yuv420p");
                if (!audioStreams.isEmpty()) {
                    command.add("-c:a");
                    command.add("libopus");
                }
            } else {
                command.add("-c:v");
                command.add("libx264");
                command.add("-pix_fmt");
                command.add("yuv420p");
                if (!audioStreams.isEmpty()) {
                    command.add("-c:a");
                    command.add("aac");
                }
            }
            // Enforce frame rate
            command.add("-r");
            command.add(String.valueOf(fps));
            
            // Limit resource usage
            command.add("-threads");
            command.add("2");

            command.add(outputFile.getAbsolutePath());

            // 3. Spawning FFmpeg process
            System.out.println("Executing FFmpeg command: " + String.join(" ", command));
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            activeProcesses.put(processing.getId(), process);

            // Read stderr/stdout and parse progress
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            Pattern timePattern = Pattern.compile("time=(\\d{2}):(\\d{2}):(\\d{2})\\.(\\d{2})");
            int lastProgress = 0;

            List<String> logLines = new ArrayList<>();
            while ((line = reader.readLine()) != null) {
                logLines.add(line);
                Matcher matcher = timePattern.matcher(line);
                if (matcher.find()) {
                    int h = Integer.parseInt(matcher.group(1));
                    int m = Integer.parseInt(matcher.group(2));
                    int s = Integer.parseInt(matcher.group(3));
                    int hundredths = Integer.parseInt(matcher.group(4));
                    double seconds = h * 3600 + m * 60 + s + hundredths / 100.0;
                    
                    int progress = (int) Math.min(100, Math.round((seconds / totalTime) * 100));
                    if (progress > lastProgress) {
                        lastProgress = progress;
                        processing.setProgressPercent(progress);
                        projectProcessingRepository.save(processing);
                        projectProcessingService.emitProgress(processing.getId(), progress, "RUNNING");
                    }
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                processing.setStatus(ProcessingStatus.SUCCESS);
                processing.setProgressPercent(100);
                processing.setFinalExportPath("/uploads/" + outputFilename);
                processing.setFinishedAt(LocalDateTime.now());
                projectProcessingService.emitProgress(processing.getId(), 100, "SUCCESS");
            } else {
                // Write error log to workspace root
                try {
                    File logFile = new File("ffmpeg_error.log");
                    List<String> errorReport = new ArrayList<>();
                    errorReport.add("FFmpeg Exit Code: " + exitCode);
                    errorReport.add("Command: " + String.join(" ", command));
                    errorReport.add("Logs:");
                    errorReport.addAll(logLines);
                    Files.write(logFile.toPath(), errorReport);
                } catch (Exception logEx) {
                    logEx.printStackTrace();
                }
                throw new RuntimeException("FFmpeg exited with error code " + exitCode);
            }

        } catch (Exception e) {
            e.printStackTrace();
            processing.setStatus(ProcessingStatus.FAILED);
            processing.setErrorMessage(e.getMessage() != null ? e.getMessage() : "Unknown error occurred during FFmpeg execution.");
            processing.setFinishedAt(LocalDateTime.now());
            projectProcessingService.emitProgress(processing.getId(), 0, "FAILED");
        } finally {
            activeFutures.remove(processing.getId());
            activeProcesses.remove(processing.getId());
            projectProcessingRepository.save(processing);
            // Cleanup temp files
            for (File temp : tempFiles) {
                try {
                    temp.delete();
                } catch (Exception ignored) {}
            }
        }
    }

    private String resolvePath(String url) {
        if (url == null) return "";
        if (url.startsWith("/uploads/")) {
            String filename = url.substring("/uploads/".length());
            File localFile = new File(new File(uploadDir).getAbsoluteFile(), filename);
            if (localFile.exists()) {
                return localFile.getAbsolutePath();
            }
        }
        return url; // Return direct HTTP URL or unchanged value
    }

    private double filterValue(Map<String, Object> filters, String key, double defaultValue) {
        Object v = filters.get(key);
        return (v instanceof Number) ? ((Number) v).doubleValue() : defaultValue;
    }

    /**
     * Builds an FFmpeg filter fragment (e.g. ",eq=...,hue=...,gblur=...") from the
     * canvas item's CSS-style filters (B4). Returns "" when all filters are at their
     * defaults so existing renders are byte-identical to before.
     * Hỗ trợ: brightness, contrast, saturation, hue, blur, grayscale.
     * (sepia/invert hiện chưa map sang FFmpeg — bỏ qua khi render.)
     */
    @SuppressWarnings("unchecked")
    private String buildColorFilterChain(Map<String, Object> item, double scale) {
        Object fObj = item.get("filters");
        if (!(fObj instanceof Map)) return "";
        Map<String, Object> f = (Map<String, Object>) fObj;

        double brightness = filterValue(f, "brightness", 100);
        double contrast = filterValue(f, "contrast", 100);
        double saturation = filterValue(f, "saturation", 100);
        double hue = filterValue(f, "hue", 0);
        double blur = filterValue(f, "blur", 0);
        double grayscale = filterValue(f, "grayscale", 0);

        boolean isDefault = brightness == 100 && contrast == 100 && saturation == 100
                && hue == 0 && blur == 0 && grayscale == 0;
        if (isDefault) return "";

        double b = brightness / 100.0 - 1.0;   // eq brightness: 0 = giữ nguyên
        double c = contrast / 100.0;            // eq contrast: 1 = giữ nguyên
        // Trộn grayscale vào saturation: grayscale 100% => saturation 0
        double s = (saturation / 100.0) * (1.0 - Math.min(1.0, grayscale / 100.0));

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(java.util.Locale.US,
                ",eq=brightness=%.4f:contrast=%.4f:saturation=%.4f", b, c, s));
        if (hue != 0) {
            sb.append(String.format(java.util.Locale.US, ",hue=h=%.4f", hue));
        }
        if (blur > 0) {
            sb.append(String.format(java.util.Locale.US, ",gblur=sigma=%.4f", blur * scale));
        }
        return sb.toString();
    }

    private boolean isVideoFile(String url) {
        if (url == null) return false;
        String cleanUrl = url.split("\\?")[0].toLowerCase();
        return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".mkv");
    }

    private boolean hasAudioStream(String filePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder(ffprobePath, "-show_streams", "-select_streams", "a", "-loglevel", "error", filePath);
            Process p = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String line = reader.readLine();
            p.waitFor();
            return line != null && !line.trim().isEmpty();
        } catch (Exception e) {
            System.err.println("Error running ffprobe for audio check: " + e.getMessage());
            return false;
        }
    }

    private String formatPathForFilter(String path) {
        String formatted = path.replace("\\", "/");
        formatted = formatted.replace(":", "\\:");
        formatted = formatted.replace(",", "\\,");
        formatted = formatted.replace("'", "\\'");
        return formatted;
    }

    private ProjectProcessingResponseDTO mapToResponse(ProjectProcessing processing) {
        ProjectProcessingResponseDTO response = new ProjectProcessingResponseDTO();
        response.setId(processing.getId());
        response.setProjectId(processing.getProjectId());
        response.setUserId(processing.getUserId());
        response.setCalculatedRamMb(processing.getCalculatedRamMb());
        response.setRequiresGpu(processing.isRequiresGpu());
        response.setStatus(processing.getStatus());
        response.setProcessingType(processing.getProcessingType());
        response.setTargetItemId(processing.getTargetItemId());
        response.setResultAssetId(processing.getResultAssetId());
        response.setProgressPercent(processing.getProgressPercent());
        response.setFinalExportPath(processing.getFinalExportPath());
        response.setErrorMessage(processing.getErrorMessage());
        return response;
    }

    @Override
    public void cancelVideoRender(String processingId) {
        ProjectProcessing processing = projectProcessingRepository.findById(processingId)
                .orElseThrow(() -> new ResourceNotFoundException("Processing job not found with id: " + processingId));
        
        if (processing.getStatus() == ProcessingStatus.QUEUED || processing.getStatus() == ProcessingStatus.RUNNING) {
            processing.setStatus(ProcessingStatus.FAILED);
            processing.setErrorMessage("Tiến trình xuất video đã bị hủy bởi người dùng.");
            processing.setFinishedAt(LocalDateTime.now());
            projectProcessingRepository.save(processing);
        }
        
        Future<?> future = activeFutures.remove(processingId);
        if (future != null) {
            future.cancel(true);
        }
        
        Process process = activeProcesses.remove(processingId);
        if (process != null && process.isAlive()) {
            process.destroyForcibly();
            System.out.println("Forcibly destroyed FFmpeg process for job: " + processingId);
        }
    }
}
