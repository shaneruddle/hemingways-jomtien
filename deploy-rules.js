#!/usr/bin/env node
/**
 * deploy-rules.js
 * Deploys firestore.rules to hemingways-jomtien-website using
 * firebase-admin ADC (Application Default Credentials).
 * Run from Cloud Shell: node deploy-rules.js
 */

const admin = require('firebase-admin');
const https = require('https');
const fs   = require('fs');
const path = require('path');

const PROJECT_ID = 'hemingways-jomtien-website';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId:  PROJECT_ID,
});

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function deployRules() {
  console.log('Getting ADC token...');
  const cred  = admin.credential.applicationDefault();
  const token = (await cred.getAccessToken()).access_token;

  const rulesPath    = path.join(__dirname, 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  console.log(`Read ${rulesContent.length} bytes from ${rulesPath}`);

  // 1. Create ruleset
  const rulesetPayload = JSON.stringify({
    source: { files: [{ content: rulesContent, name: 'firestore.rules' }] }
  });

  console.log('Creating ruleset...');
  const createRes = await httpsRequest({
    hostname: 'firebaserules.googleapis.com',
    path:     `/v1/projects/${PROJECT_ID}/rulesets`,
    method:   'POST',
    headers:  {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(rulesetPayload),
    },
  }, rulesetPayload);

  if (createRes.status !== 200 || !createRes.body.name) {
    console.error('Failed to create ruleset:', JSON.stringify(createRes.body, null, 2));
    process.exit(1);
  }
  const rulesetName = createRes.body.name;
  console.log('Created ruleset:', rulesetName);

  // 2. Update release
  const releasePayload = JSON.stringify({
    release: {
      name:        `projects/${PROJECT_ID}/releases/cloud.firestore`,
      rulesetName: rulesetName,
    }
  });

  console.log('Updating release...');
  const patchRes = await httpsRequest({
    hostname: 'firebaserules.googleapis.com',
    path:     `/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    method:   'PATCH',
    headers:  {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(releasePayload),
    },
  }, releasePayload);

  if (patchRes.status !== 200 || !patchRes.body.name) {
    console.error('Failed to update release:', JSON.stringify(patchRes.body, null, 2));
    process.exit(1);
  }

  console.log('✓ Firestore rules deployed successfully!');
  console.log('  Release:', patchRes.body.name);
}

deployRules().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
