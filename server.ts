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

  // Canonical host: 301 the bare domain to www (SEO - avoids duplicate content).
  // new.hemingwaysjomtien.com is left alone so it stays usable as a staging alias.
  app.use((req, res, next) => {
    const host = (req.headers.host || '').toLowerCase().split(':')[0];
    if (host === 'hemingwaysjomtien.com' && (req.method === 'GET' || req.method === 'HEAD')) {
      return res.redirect(301, `https://www.hemingwaysjomtien.com${req.originalUrl}`);
    }
    return next();
  });

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '20mb' }));

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

          // Guard against oversized files (e.g. un-resized uploads) — buffering
          // a huge file into memory here can crash the request with an opaque 500.
          const MAX_PROXY_BYTES = 15 * 1024 * 1024; // 15MB
          if (meta.size && Number(meta.size) > MAX_PROXY_BYTES) {
            console.warn(`image-proxy: ${cleanPath} is ${meta.size} bytes, exceeds ${MAX_PROXY_BYTES} limit — skipping`);
          } else {
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
  const bodySize = JSON.stringify(req.body).length;
  console.log(`[extract-receipt] hit, bodySize=${bodySize}, hasImage=${!!req.body?.imageBase64}`);
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
    const { name, email, message, type, phone, date, time, guests } = req.body;
    const isReservation = type === 'reservation';

    console.log(isReservation ? "New Reservation Request:" : "New Contact Form Submission:");
    console.log(`Name: ${name}`);
    if (isReservation) {
      console.log(`Phone/WhatsApp: ${phone}`);
      console.log(`Date: ${date}  Time: ${time}  Guests: ${guests}`);
    } else {
      console.log(`Email: ${email}`);
    }
    console.log(`Message: ${message || ''}`);

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

      const subject = isReservation
        ? `New Reservation Request from ${name} (${date} ${time}, ${guests} guests)`
        : `New Contact Form Submission from ${name}`;

      const text = isReservation
        ? `Name: ${name}\nPhone/WhatsApp: ${phone}\nDate: ${date}\nTime: ${time}\nGuests: ${guests}\n\nSpecial Requests:\n${message || '(none)'}`
        : `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

      const html = isReservation
        ? `
          <h3>New Reservation Request</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone/WhatsApp:</strong> ${phone}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Guests:</strong> ${guests}</p>
          <p><strong>Special Requests:</strong></p>
          <p>${(message || '(none)').replace(/\n/g, '<br>')}</p>
        `
        : `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `;

      const mailOptions = {
        from: `"${name}" <${smtpConfig.auth.user}>`, // Use the authenticated user as sender
        to: "info@hemingwaysjomtien.com",
        replyTo: email || undefined,
        subject,
        text,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ─── SEO: robots.txt, sitemap.xml and per-route meta tags ────────────────────
  const SITE_ORIGIN = 'https://www.hemingwaysjomtien.com';
  const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/roast-food.jpg`;
  const DEFAULT_DESCRIPTION = "Hemingways Jomtien is Jomtien's biggest expat sports bar and restaurant - famous pub food, Sunday roasts, live sport on 15 screens and cold draught beer. Open daily 9:30 AM - 12:00 AM.";

  const getAdminDb = () => {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: "hemingways-jomtien-website.firebasestorage.app",
      });
    }
    return admin.firestore();
  };

  const fetchPublishedPosts = async (): Promise<any[]> => {
    try {
      const snap = await getAdminDb()
        .collection('blog_posts')
        .where('published', '==', true)
        .get();
      return snap.docs.map(d => d.data());
    } catch (err) {
      console.error('Sitemap/meta: failed to load blog posts:', err);
      return [];
    }
  };

  const escapeHtml = (str: string) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const STATIC_META: Record<string, { title: string; description: string; image?: string }> = {
    '/': {
      title: "Hemingways Jomtien - Jomtien's Biggest Expat Sports Bar & Restaurant",
      description: DEFAULT_DESCRIPTION,
    },
    '/contact-us': {
      title: 'Contact Us | Hemingways Jomtien',
      description: 'Call, message or find Hemingways Jomtien. Reservations, group bookings and private events. Jomtien Sai 2 Road, Pattaya. Open daily 9:30 AM - 12:00 AM.',
    },
    '/blog': {
      title: 'Blog - News & Events | Hemingways Jomtien',
      description: "What's on at Hemingways Jomtien - events, live sport, new dishes and everything in between.",
    },
    '/menu': {
      title: 'Food & Drinks Menu | Hemingways Jomtien',
      description: 'Browse the full Hemingways Jomtien menu - famous pub food, Western and Thai dishes, Sunday roasts, burgers and a full bar.',
    },
    '/digital-menu': {
      title: 'Food & Drinks Menu | Hemingways Jomtien',
      description: 'Browse the full Hemingways Jomtien menu - famous pub food, Western and Thai dishes, Sunday roasts, burgers and a full bar.',
    },
  };

  const absoluteImage = (img?: string) => {
    if (!img) return DEFAULT_OG_IMAGE;
    if (img.startsWith('http')) return img;
    return `${SITE_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  const buildSeoTags = (opts: { title: string; description: string; url: string; image?: string; type?: string }) => {
    const title = escapeHtml(opts.title);
    const description = escapeHtml(opts.description);
    const image = escapeHtml(absoluteImage(opts.image));
    const url = escapeHtml(opts.url);
    const type = opts.type || 'website';
    return [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:site_name" content="Hemingways Jomtien" />`,
      `<meta property="og:type" content="${type}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${image}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${image}" />`,
    ].join('\n    ');
  };

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /dashboard',
        'Disallow: /staff',
        'Disallow: /admin',
        'Disallow: /import',
        '',
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        '',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (_req, res) => {
    const posts = await fetchPublishedPosts();
    const today = new Date().toISOString().slice(0, 10);

    const urls: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [
      { loc: `${SITE_ORIGIN}/`, lastmod: today, priority: '1.0', changefreq: 'weekly' },
      { loc: `${SITE_ORIGIN}/menu`, lastmod: today, priority: '0.9', changefreq: 'weekly' },
      { loc: `${SITE_ORIGIN}/contact-us`, lastmod: today, priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE_ORIGIN}/blog`, lastmod: today, priority: '0.8', changefreq: 'weekly' },
    ];

    for (const post of posts) {
      if (!post?.slug) continue;
      urls.push({
        loc: `${SITE_ORIGIN}/blog/${post.slug}`,
        lastmod: (post.updatedAt || post.date || today).slice(0, 10),
        priority: '0.7',
        changefreq: 'monthly',
      });
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(u =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      ),
      '</urlset>',
      '',
    ].join('\n');

    res.header('Cache-Control', 'public, max-age=600');
    res.type('application/xml').send(xml);
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
    
    app.use(express.static(distPath, { index: false }));
    
    const indexHtmlPath = path.join(distPath, 'index.html');

    app.get('*', async (req, res) => {
      try {
        const html = fs.readFileSync(indexHtmlPath, 'utf-8');
        const routePath = req.path.replace(/\/+$/, '') || '/';
        const url = `${SITE_ORIGIN}${routePath === '/' ? '/' : routePath}`;

        let meta = STATIC_META[routePath];
        let type = 'website';
        let image: string | undefined;

        const blogMatch = routePath.match(/^\/blog\/([a-z0-9-]+)$/i);
        if (blogMatch) {
          const posts = await fetchPublishedPosts();
          const post = posts.find(p => p?.slug === blogMatch[1]);
          if (post) {
            meta = {
              title: `${post.title} | Hemingways Jomtien`,
              description: post.excerpt || DEFAULT_DESCRIPTION,
            };
            image = post.heroImage;
            type = 'article';
          }
        }

        if (!meta) {
          meta = {
            title: "Hemingways Jomtien - Jomtien's Biggest Expat Sports Bar & Restaurant",
            description: DEFAULT_DESCRIPTION,
          };
        }

        const tags = buildSeoTags({ title: meta.title, description: meta.description, url, image, type });
        return res.send(html.replace('<!--SEO-->', tags));
      } catch (err) {
        console.error('Meta injection failed, serving raw index.html:', err);
        return res.sendFile(indexHtmlPath);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
