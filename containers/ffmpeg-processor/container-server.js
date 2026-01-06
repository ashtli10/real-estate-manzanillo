/**
 * FFmpeg Container Server
 * 
 * This script runs INSIDE the Docker container.
 * It receives HTTP requests and uses FFmpeg to process videos and images.
 * 
 * Version: 1.4.0 - Added image resizing support
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 8080;
const TEMP_DIR = '/tmp/ffmpeg-work';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    console.log('Running FFmpeg:', args.join(' '));
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Extract thumbnail from video
 * Preserves original aspect ratio, scales to max 480px width
 */
async function extractThumbnail(videoPath, outputPath, timeSeconds = 0) {
  await runFFmpeg([
    '-y',
    '-ss', timeSeconds.toString(),
    '-i', videoPath,
    '-vframes', '1',
    '-vf', 'scale=480:-2',  // 480px width, auto height (keeps aspect ratio)
    '-q:v', '2',
    outputPath
  ]);
}

/**
 * Generate GIF preview from video
 * Creates a tiny thumbnail-sized GIF for hover previews
 */
async function generateGif(videoPath, outputPath, startTime = 0, duration = 2) {
  // Tiny thumbnail GIF settings:
  // - 160px wide (thumbnail size, matches thumb.jpg proportionally)
  // - 6 fps (18 total frames for 3 seconds)
  // - 64 colors max (very small file)
  // - 2 second duration (shorter preview)
  // Target: 50-150KB instead of 1-2MB
  await runFFmpeg([
    '-y',
    '-ss', startTime.toString(),
    '-t', Math.min(duration, 2).toString(),  // Max 2 seconds
    '-i', videoPath,
    '-vf', 'fps=6,scale=160:-1:flags=fast_bilinear,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2',
    '-loop', '0',
    outputPath
  ]);
}

/**
 * Resize an image using FFmpeg
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {Object} options - Resize options
 * @param {number} options.width - Target width
 * @param {number} options.height - Target height  
 * @param {string} options.fit - 'cover' (crop to fill), 'contain' (fit within), 'scale-down' (shrink only)
 * @param {number} options.quality - JPEG quality 1-31 (lower = better, 2 is high quality)
 */
async function resizeImage(inputPath, outputPath, options = {}) {
  const { width = 800, height = 600, fit = 'scale-down', quality = 2 } = options;
  
  let vfArgs;
  
  if (fit === 'cover') {
    // Crop to fill: scale to cover the area, then crop center
    vfArgs = `scale=w=${width}:h=${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  } else if (fit === 'contain') {
    // Fit within bounds, may have letterboxing (but we won't add padding)
    vfArgs = `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease`;
  } else {
    // scale-down: only shrink if larger, maintain aspect ratio
    vfArgs = `scale=w='min(${width},iw)':h='min(${height},ih)':force_original_aspect_ratio=decrease`;
  }
  
  await runFFmpeg([
    '-y',
    '-i', inputPath,
    '-vf', vfArgs,
    '-q:v', quality.toString(),
    outputPath
  ]);
}

/**
 * Clean up temporary files
 */
function cleanup(files) {
  for (const file of files) {
    try { fs.unlinkSync(file); } catch {}
  }
}

/**
 * Process video request
 */
async function processVideo(req, res) {
  const startTime = Date.now();
  const workId = randomUUID();
  const tempFiles = [];
  
  try {
    // Parse request body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const request = JSON.parse(body);
    
    const { videoUrl, operations = ['thumbnail', 'gif'], thumbnailTime = 2, gifStart = 0, gifDuration = 3 } = request;
    
    if (!videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing videoUrl' }));
      return;
    }
    
    console.log(`Processing video: ${videoUrl}`);
    
    // Download video
    const ext = path.extname(new URL(videoUrl).pathname) || '.mp4';
    const videoPath = path.join(TEMP_DIR, `${workId}${ext}`);
    tempFiles.push(videoPath);
    
    console.log(`Fetching video from URL...`);
    let videoResponse;
    try {
      videoResponse = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'FFmpegProcessor/1.0'
        }
      });
    } catch (fetchError) {
      console.error(`Fetch error: ${fetchError.message}`);
      throw new Error(`Network fetch failed: ${fetchError.message}`);
    }
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    fs.writeFileSync(videoPath, videoBuffer);
    
    console.log(`Downloaded video: ${videoBuffer.length} bytes`);
    
    const results = { success: true };
    
    // Extract thumbnail
    if (operations.includes('thumbnail')) {
      const thumbPath = path.join(TEMP_DIR, `${workId}.thumb.jpg`);
      tempFiles.push(thumbPath);
      
      await extractThumbnail(videoPath, thumbPath, thumbnailTime);
      
      results.thumbnailData = fs.readFileSync(thumbPath).toString('base64');
      results.thumbnailSize = fs.statSync(thumbPath).size;
      console.log(`Generated thumbnail: ${results.thumbnailSize} bytes`);
    }
    
    // Generate GIF
    if (operations.includes('gif')) {
      const gifPath = path.join(TEMP_DIR, `${workId}.preview.gif`);
      tempFiles.push(gifPath);
      
      await generateGif(videoPath, gifPath, gifStart, gifDuration);
      
      results.gifData = fs.readFileSync(gifPath).toString('base64');
      results.gifSize = fs.statSync(gifPath).size;
      console.log(`Generated GIF: ${results.gifSize} bytes`);
    }
    
    results.processingTime = Date.now() - startTime;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    
  } catch (error) {
    console.error('Processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    }));
  } finally {
    cleanup(tempFiles);
  }
}

/**
 * HTTP server
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ffmpeg: true,
      container: true,
      version: '1.4.0'
    }));
    return;
  }
  
  // Process video
  if (url.pathname === '/process' && req.method === 'POST') {
    await processVideo(req, res);
    return;
  }
  
  // Process image
  if (url.pathname === '/resize-image' && req.method === 'POST') {
    await processImage(req, res);
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

/**
 * Process image resize request
 */
async function processImage(req, res) {
  const startTime = Date.now();
  const workId = randomUUID();
  const tempFiles = [];
  
  try {
    // Parse request body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const request = JSON.parse(body);
    
    const { imageUrl, variants = [] } = request;
    
    if (!imageUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing imageUrl' }));
      return;
    }
    
    if (!variants.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing variants array' }));
      return;
    }
    
    console.log(`Processing image: ${imageUrl}`);
    console.log(`Variants requested: ${JSON.stringify(variants)}`);
    
    // Download image
    const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
    const imagePath = path.join(TEMP_DIR, `${workId}${ext}`);
    tempFiles.push(imagePath);
    
    console.log(`Fetching image from URL...`);
    const imageResponse = await fetch(imageUrl, {
      headers: { 'User-Agent': 'FFmpegProcessor/1.4.0' }
    });
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`Downloaded image: ${imageBuffer.length} bytes`);
    
    const results = { success: true, variants: {} };
    
    // Process each variant
    for (const variant of variants) {
      const { name, width, height, fit = 'scale-down', quality = 2 } = variant;
      
      const outPath = path.join(TEMP_DIR, `${workId}.${name}.jpg`);
      tempFiles.push(outPath);
      
      await resizeImage(imagePath, outPath, { width, height, fit, quality });
      
      results.variants[name] = {
        data: fs.readFileSync(outPath).toString('base64'),
        size: fs.statSync(outPath).size
      };
      console.log(`Generated ${name}: ${results.variants[name].size} bytes`);
    }
    
    results.processingTime = Date.now() - startTime;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    
  } catch (error) {
    console.error('Image processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    }));
  } finally {
    cleanup(tempFiles);
  }
}

server.listen(PORT, () => {
  console.log(`FFmpeg Container Server v1.4.0 running on port ${PORT}`);
});
