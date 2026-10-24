const fs = require('fs');
const path = require('path');
const { DEFAULTS, normalize, migrateAppearance } = require('../shared/validation');

class SettingsStorage {
  constructor(file) {
    this.file = file;
    this.values = {};
    this.claimed = new Set();
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SyntaxError('Invalid settings');
      const migrated = migrateAppearance(parsed);
      for (const key of Object.keys(DEFAULTS)) {
        if (Object.hasOwnProperty.call(migrated, key)) this.values[key] = normalize(key, migrated[key]);
      }
      this.claimed = new Set(Array.isArray(parsed._claimedKeys) ? parsed._claimedKeys.filter(key => Object.hasOwnProperty.call(DEFAULTS, key))
        : Object.keys(this.values).filter(key => this.values[key] !== DEFAULTS[key]));
      if (parsed.ui_theme === 'glass') this.claimed.add('liquid_glass');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Keep a recoverable copy rather than replacing malformed user data.
        if (!(error instanceof SyntaxError)) throw error;
        fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
      }
    }
  }
  initialize(legacy = {}) {
    legacy = migrateAppearance(legacy);
    const next = { ...this.values };
    const claimed = new Set(this.claimed);
    for (const key of Object.keys(DEFAULTS)) {
      // A first run on a different port must not prevent later legacy migration.
      if (!claimed.has(key) && legacy && legacy[key] != null) {
        next[key] = normalize(key, legacy[key]);
        claimed.add(key);
      } else if (!Object.hasOwnProperty.call(next, key)) next[key] = DEFAULTS[key];
    }
    this.save(next, claimed);
    return { ...this.values };
  }
  set(key, value) {
    const normalized = normalize(key, value);
    this.save({ ...this.values, [key]: normalized }, new Set([...this.claimed, key]));
    return normalized;
  }
  save(values, claimed = this.claimed) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify({ ...values, _claimedKeys: [...claimed] }, null, 2), { mode: 0o600 });
    fs.renameSync(`${this.file}.tmp`, this.file);
    this.values = values;
    this.claimed = claimed;
  }
}
module.exports = { SettingsStorage };
