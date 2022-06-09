import * as fs from 'fs';

const API_KEY_JSON_PATH = process.env.API_KEY_JSON_PATH as string;
let ApiKeyUserMap: Record<string, string> = {};

if (API_KEY_JSON_PATH) {
  try {
    const file = fs.readFileSync(API_KEY_JSON_PATH, 'utf8');
    ApiKeyUserMap = JSON.parse(file);
  } catch (err) {
    console.error(`Error parsing API_KEY_JSON_PATH(${API_KEY_JSON_PATH}): ${err.message}`, err);
  }
}

export default ApiKeyUserMap;
