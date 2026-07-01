import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // Serve public assets with logging for debugging
  const publicDir = path.join(process.cwd(), 'public');
  
  // Helper to determine if a route requests an image file (helps bypass JS/CSS assets)
  const isImageRequest = (pathStr: string) => /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(pathStr);

  // Explicit route for menu images and other static folders to ensure they are served correctly
  // Support nested subdirectory structures (like menu-items/french-onion-soup/...) and redirect to image-proxy if not on local disk
  app.get('/menu-items/*', (req, res, next) => {
    if (!isImageRequest(req.path)) {
      return next();
    }
    const relativePath = req.path.replace(/^\/+/, '');
    const filePath = path.join(publicDir, relativePath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    // Forward/Redirect to Firebase image proxy
    return res.redirect(`/api/image-proxy?path=${encodeURIComponent(relativePath)}`);
  });

  app.get('/menu/*', (req, res, next) => {
    if (!isImageRequest(req.path)) {
      return next();
    }
    const relativePath = req.path.replace(/^\/+/, '');
    const filePath = path.join(publicDir, relativePath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    // Forward/Redirect to Firebase image proxy
    return res.redirect(`/api/image-proxy?path=${encodeURIComponent(relativePath)}`);
  });

  app.get('/assets/*', (req, res, next) => {
    if (!isImageRequest(req.path)) {
      return next();
    }
    const relativePath = req.path.replace(/^\/+/, '');
    const filePath = path.join(publicDir, relativePath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    // Forward/Redirect to Firebase image proxy
    return res.redirect(`/api/image-proxy?path=${encodeURIComponent(relativePath)}`);
  });

  app.get('/logo.png', (req, res) => {
    const filePath = path.join(publicDir, 'logo.png');
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).send('Not found');
  });

  app.use(express.static(publicDir));

  // API routes
  app.post("/api/save-hero", async (req, res) => {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    try {
      // Extract base64 data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      const optimizedBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();

      const bucketName = "hemingways-jomtien-website.firebasestorage.app";
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: bucketName
        });
      }
      
      const bucket = admin.storage().bucket(bucketName);
      const fileRef = bucket.file('assets/hero.webp');

      await fileRef.save(optimizedBuffer, {
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000'
        }
      });

      console.log(`Hero image saved directly to Firebase Storage at assets/hero.webp`);
      res.json({ success: true, url: `/api/image-proxy?path=${encodeURIComponent('assets/hero.webp')}` });
    } catch (error: any) {
      console.error("Error saving hero image to Firebase Storage:", error);
      res.status(500).json({ error: "Failed to save hero image to Firebase Storage: " + error.message });
    }
  });

  app.post("/api/upload-image", async (req, res) => {
    const { image, storagePath, contentType } = req.body;
    if (!image || !storagePath) {
      return res.status(400).json({ error: "Missing image or storagePath" });
    }

    try {
      // Decode base64 image data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = contentType || "image/webp";

      // Optimize image to WebP using sharp if config allows
      let optimizedBuffer = buffer;
      let finalStoragePath = storagePath;
      let finalMimeType = mimeType;

      if (mimeType.startsWith("image/") && !storagePath.endsWith(".svg")) {
        try {
          optimizedBuffer = await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer();
          // Change extension in storagePath to .webp
          const pathParts = storagePath.split('.');
          if (pathParts.length > 1) {
            pathParts[pathParts.length - 1] = 'webp';
            finalStoragePath = pathParts.join('.');
          } else {
            finalStoragePath = `${storagePath}.webp`;
          }
          finalMimeType = "image/webp";
        } catch (sharpError) {
          console.warn("Sharp optimization failed, using original buffer:", sharpError);
        }
      }

      const bucketName = "hemingways-jomtien-website.firebasestorage.app";
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: bucketName
        });
      }
      
      const bucket = admin.storage().bucket(bucketName);
      const fileRef = bucket.file(finalStoragePath);

      // Save directly to Firebase Storage via Admin SDK (not onto local ephemeral disk)
      await fileRef.save(optimizedBuffer, {
        metadata: {
          contentType: finalMimeType,
          cacheControl: 'public, max-age=31536000'
        }
      });

      const gsUrl = `gs://${bucketName}/${finalStoragePath}`;
      console.log(`Successfully uploaded image directly to Firebase Storage: ${gsUrl}`);

      const proxyUrl = `/api/image-proxy?path=${encodeURIComponent(finalStoragePath)}`;
      res.json({
        success: true,
        url: proxyUrl,
        gsUrl: gsUrl,
        source: 'firebase'
      });
    } catch (error: any) {
      console.error("Error uploading image directly to Firebase Storage:", error);
      res.status(500).json({ error: error.message || "Failed to process image upload to Firebase Storage" });
    }
  });

  app.get("/api/image-proxy", async (req, res) => {
    try {
      const pathParam = req.query.path as string;
      if (!pathParam) return res.status(400).send('No path provided');
      const cleanPath = pathParam.replace(/^\/+/, '');
      const bucketName = "hemingways-jomtien-website.firebasestorage.app";
      
      // Get download URL via GCS REST API
      const encodedPath = encodeURIComponent(cleanPath);
      const metaUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodedPath}`;
      
      let gotImage = false;
      try {
        const metaResponse = await fetch(metaUrl);
        if (metaResponse.ok) {
          const meta = await metaResponse.json() as any;
          const downloadToken = meta.downloadTokens;
          const downloadUrl = downloadToken 
            ? `${metaUrl}?alt=media&token=${downloadToken}` 
            : `${metaUrl}?alt=media`;
          
          const imgResponse = await fetch(downloadUrl);
          if (imgResponse.ok) {
            const contentType = meta.contentType || 'image/webp';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            const arrayBuffer = await imgResponse.arrayBuffer();
            res.send(Buffer.from(arrayBuffer));
            gotImage = true;
            return;
          }
        }
      } catch (fetchError: any) {
        console.warn(`image-proxy GCS fetch failed for ${cleanPath}:`, fetchError.message);
      }

      if (!gotImage) {
        // Fallback to local filesystem
        const localFilePath = path.join(process.cwd(), 'public', cleanPath);
        if (fs.existsSync(localFilePath)) {
          let contentType = "image/webp";
          const ext = path.extname(localFilePath).toLowerCase();
          if (ext === '.svg') contentType = 'image/svg+xml';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.webp') contentType = 'image/webp';
          else if (ext === '.gif') contentType = 'image/gif';

          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=31536000");
          return res.sendFile(localFilePath);
        }

        // Default fallback: logo.png
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath) && cleanPath !== 'logo.png') {
          res.setHeader("Content-Type", "image/png");
          return res.sendFile(logoPath);
        }

        return res.status(404).send('Image not found');
      }
    } catch (error) {
      console.error('Image proxy error:', error);
      res.status(500).send('Error fetching image');
    }
  });

  app.get("/api/list-images", async (req, res) => {
    try {
      const folder = (req.query.folder as string) || 'assets';
      const bucketName = "hemingways-jomtien-website.firebasestorage.app";
      let images: any[] = [];
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;

      // 1. Use Firebase Storage REST API to list files
      try {
        const encodedPrefix = encodeURIComponent(prefix);
        const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o?prefix=${encodedPrefix}&maxResults=1000`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json() as any;
          const items = data.items || [];
          images = items
            .filter((item: any) => !item.name.endsWith('/'))
            .filter((item: any) => /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(item.name))
            .map((item: any) => {
              const name = item.name;
              const fileName = name.split('/').pop() || name;
              const proxyUrl = `/api/image-proxy?path=${encodeURIComponent(name)}`;
              return {
                id: name,
                name: fileName,
                url: proxyUrl,
                folder: folder,
                path: name,
                gsUrl: `gs://${bucketName}/${name}`,
                createdAt: item.timeCreated || new Date().toISOString(),
                size: parseInt(item.size || '0')
              };
            });
          console.log(`Listed ${images.length} images recursively via Storage REST API in ${folder}/`);
        }
      } catch (restErr: any) {
        console.warn(`REST API listing failed for folder ${folder}:`, restErr.message);
      }

      // 2. Fallback to local files list if still empty
      if (images.length === 0) {
        const folderDir = path.join(process.cwd(), 'public', folder);
        if (fs.existsSync(folderDir)) {
          const localFiles = await fs.promises.readdir(folderDir);
          const localImageFiles = localFiles.filter((filename) => /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(filename));
          const mappedFiles = await Promise.all(localImageFiles.map(async (filename) => {
            const fullPath = path.join(folderDir, filename);
            const relativePath = `${folder}/${filename}`;
            const stats = await fs.promises.stat(fullPath);
            let contentType = 'image/jpeg';
            const ext = path.extname(filename).toLowerCase();
            if (ext === '.svg') contentType = 'image/svg+xml';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';
            else if (ext === '.gif') contentType = 'image/gif';
            
            return {
              id: relativePath,
              name: filename,
              url: `/api/image-proxy?path=${encodeURIComponent(relativePath)}`,
              folder: folder,
              path: relativePath,
              gsUrl: `gs://${bucketName}/${relativePath}`,
              createdAt: stats.birthtime.toISOString(),
              size: stats.size
            };
          }));
          images = mappedFiles;
        }
      }

      // Sort by creation date descending
      images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(images);
    } catch (error: any) {
      console.error('Error listing images:', error);
      res.status(500).json({ error: error.message || 'Failed to list images' });
    }
  });

  app.post("/api/delete-image", async (req, res) => {
    const { fullPath } = req.body;
    if (!fullPath) {
      return res.status(400).json({ error: "Missing fullPath" });
    }

    try {
      let fbSuccess = false;

      // 1. Try Firebase Storage deletion
      try {
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: "hemingways-jomtien-website.firebasestorage.app"
          });
        }
        const bucket = admin.storage().bucket();
        const file = bucket.file(fullPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          fbSuccess = true;
          console.log(`Backend deleted image from Firebase Storage: ${fullPath}`);
        }
      } catch (adminError: any) {
        console.error("Firebase Admin Storage delete failed:", adminError.message);
      }

      // 2. Local fallback deletion
      const localFilePath = path.join(process.cwd(), 'public', fullPath);
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath);
        console.log(`Backend deleted local fallback file: ${fullPath}`);
      }

      res.json({ success: true, fbDeleted: fbSuccess });
    } catch (error: any) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: error.message || "Failed to delete image" });
    }
  });

  app.post("/api/rename-image", async (req, res) => {
    const { fullPath, newPath } = req.body;
    if (!fullPath || !newPath) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      let fbSuccess = false;
      let newMetadata: any = {};

      // 1. Try Firebase Admin Storage rename (copy + delete)
      try {
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: "hemingways-jomtien-website.firebasestorage.app"
          });
        }
        const bucket = admin.storage().bucket();
        const oldFile = bucket.file(fullPath);
        const newFile = bucket.file(newPath);

        const [exists] = await oldFile.exists();
        if (exists) {
          await oldFile.copy(newFile);
          await oldFile.delete();
          fbSuccess = true;
          
          const [meta] = await newFile.getMetadata();
          newMetadata = meta;
          console.log(`Backend renamed image in Firebase Storage from ${fullPath} to ${newPath}`);
        }
      } catch (adminError: any) {
        console.error("Firebase Admin Storage rename failed:", adminError.message);
      }

      // 2. Local fallback rename
      const oldLocalPath = path.join(process.cwd(), 'public', fullPath);
      const newLocalPath = path.join(process.cwd(), 'public', newPath);
      
      if (fs.existsSync(oldLocalPath)) {
        const localDir = path.dirname(newLocalPath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        await fs.promises.rename(oldLocalPath, newLocalPath);
        console.log(`Backend renamed local file from ${fullPath} to ${newPath}`);
      }

      res.json({
        success: true,
        fbRenamed: fbSuccess,
        gsUrl: `gs://hemingways-jomtien-website.firebasestorage.app/${newPath}`,
        url: `/api/image-proxy?path=${encodeURIComponent(newPath)}`,
        size: parseInt(newMetadata.size || '0'),
        contentType: newMetadata.contentType || 'image/webp',
        timeCreated: newMetadata.timeCreated || new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error renaming image:", error);
      res.status(500).json({ error: error.message || "Failed to rename image" });
    }
  });

  app.get("/api/place-details/:placeId", async (req, res) => {
    const { placeId } = req.params;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return res.status(500).json({ 
        status: 'REQUEST_DENIED', 
        error_message: "Google Maps API Key is not configured on the server. To fix this, please go to the AI Studio Settings menu and add GOOGLE_MAPS_API_KEY to your Secrets. If you have already added it, make sure the name is exactly GOOGLE_MAPS_API_KEY." 
      });
    }

    try {
      console.log(`Fetching details for Place ID: ${placeId}`);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,website,url,reviews&key=${apiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google API responded with status ${response.status}: ${errorText}`);
        return res.status(response.status).json({ 
          status: 'ERROR', 
          error_message: `Google API error: ${response.statusText}` 
        });
      }

      const data = await response.json() as any;
      console.log(`Google API Response Status: ${data.status}`);
      
      if (data.status !== 'OK') {
        console.error(`Google API returned non-OK status: ${data.status}`, data.error_message);
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching from Google Places API:", error);
      res.status(500).json({ 
        status: 'ERROR', 
        error_message: "Internal server error while fetching place details from Google." 
      });
    }
  });

  app.post("/api/extract-receipt", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return res.status(500).json({ success: false, error: "OCR service not configured" });
  }
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: "No image provided" });
  }

  try {
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 }
            },
            {
              type: "text",
              text: `Extract expense information from this receipt image. Return ONLY valid JSON with no markdown fences:
{
  "amount": <total as number>,
  "description": "brief description of what was purchased",
  "categoryName": "category name (e.g. Food & Beverage, Cleaning Supplies, Utilities, Maintenance, etc.)",
  "date": "YYYY-MM-DD or empty string if not visible",
  "lineItems": [
    { "description": "item name", "amount": <number>, "quantity": <number> }
  ]
}
Rules: look for total/grand total for amount. Return ALL line items. Return ONLY valid JSON, no markdown.`
            }
          ]
        }]
      })
    });

    const claudeData = await claudeResp.json();
    console.log("Claude raw response:", JSON.stringify(claudeData).substring(0, 500));
    const claudeText = claudeData?.content?.[0]?.text || "{}";
    console.log("Claude text:", claudeText.substring(0, 200));
    const clean = claudeText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(clean); } catch(e) { console.error("JSON parse error:", e); }
    return res.json({ success: true, data: parsed });

  } catch (error) {
    console.error("Receipt extraction error:", error);
    return res.status(500).json({ success: false, error: "Failed to extract receipt data", _debug: String(error) });
  }
});
app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;
    console.log("New Contact Form Submission:");
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Message: ${message}`);
    
    // SMTP Configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // Check if SMTP is configured
    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.warn("SMTP is not fully configured. Logging message to console instead of sending email.");
      return res.json({ 
        success: true, 
        message: "Message received (SMTP not configured, logged to console)" 
      });
    }

    try {
      const transporter = nodemailer.createTransport(smtpConfig);

      const mailOptions = {
        from: `"${name}" <${smtpConfig.auth.user}>`, // Use the authenticated user as sender
        to: "info@hemingwaysjomtien.com",
        replyTo: email,
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
