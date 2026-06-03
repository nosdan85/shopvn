/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dangKySource = fs.readFileSync(path.join(__dirname, '..', 'app', 'dang-ky', 'page.tsx'), 'utf8');
const navbarSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'components', 'Navbar.tsx'), 'utf8');

test('signup page no longer offers Discord registration in the web-account flow', () => {
  assert.doesNotMatch(dangKySource, /Đăng ký bằng Discord|Dang ky bang Discord/);
});

test('account menu includes a Discord account-link entry', () => {
  assert.match(navbarSource, /Lien Ket Discord|Discord:/);
});

const discordCallbackSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lien-ket-discord', 'callback', 'page.tsx'), 'utf8');

test('discord callback no longer blocks linking with a frontend login-required guard', () => {
  assert.doesNotMatch(discordCallbackSource, /Bạn cần đăng nhập để liên kết Discord|Ban can dang nhap de lien ket Discord/);
});

test('discord callback only processes the OAuth code once', () => {
  assert.match(discordCallbackSource, /daXuLyRef/);
});
