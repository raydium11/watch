import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeVideoId,
  isValidYouTubeVideoId,
  getEmbedUrl,
  getYouTubeWatchUrl,
  getYouTubeThumbnailUrl,
  mapPlayerErrorCode,
} from "../lib/youtube.ts";

const ID = "dQw4w9WgXcQ";

test("recognises standard watch URLs", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123&index=3`,
    `https://www.youtube.com/watch?feature=share&v=${ID}`,
    `https://www.youtube.com/watch/?v=${ID}`,
    `https://WWW.YouTube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}#comments`,
  ]) {
    assert.equal(extractYouTubeVideoId(url), ID, url);
  }
});

test("recognises youtu.be URLs", () => {
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${ID}?si=abc123&t=10`), ID);
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${ID}/`), ID);
});

test("recognises Shorts, embed and live URLs", () => {
  assert.equal(extractYouTubeVideoId(`https://youtube.com/shorts/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/shorts/${ID}?feature=share`), ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/embed/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/embed/${ID}?autoplay=1`), ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/live/${ID}`), ID);
});

test("trims whitespace and accepts links without a scheme", () => {
  assert.equal(extractYouTubeVideoId(`   https://youtu.be/${ID}  \n`), ID);
  assert.equal(extractYouTubeVideoId(`youtu.be/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`www.youtube.com/watch?v=${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`//youtube.com/shorts/${ID}`), ID);
  assert.equal(extractYouTubeVideoId(`youtube.com:443/watch?v=${ID}`), ID);
});

test("accepts a bare video ID", () => {
  assert.equal(extractYouTubeVideoId(ID), ID);
  assert.equal(extractYouTubeVideoId("a-b_c-d_e-f"), "a-b_c-d_e-f");
});

test("rejects invalid and malicious input", () => {
  for (const bad of [
    "",
    "   ",
    "hello",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQX",
    "https://www.youtube.com/watch?v=dQw4w9WgXc!",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/channel/UC38IQsAvIsxxjztdMZQtwHA",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/playlist?list=PL123",
    "https://youtu.be/",
    "javascript:alert(1)",
    "JavaScript:alert('https://youtu.be/dQw4w9WgXcQ')",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    "https://youtu.be/dQw4w9WgXcQ extra words",
    "https://youtu.be/<script>",
    "dQw4w9WgXc",
    "a".repeat(5000),
  ]) {
    assert.equal(extractYouTubeVideoId(bad), null, JSON.stringify(bad.slice(0, 80)));
  }
});

test("rejects non-string input", () => {
  for (const bad of [null, undefined, 42, {}, [], true]) {
    assert.equal(extractYouTubeVideoId(bad), null);
  }
});

test("validates IDs", () => {
  assert.equal(isValidYouTubeVideoId(ID), true);
  assert.equal(isValidYouTubeVideoId("dQw4w9WgXc"), false);
  assert.equal(isValidYouTubeVideoId("dQw4w9WgXc/"), false);
  assert.equal(isValidYouTubeVideoId("../../etc/pa"), false);
  assert.equal(isValidYouTubeVideoId(12345678901), false);
});

test("builds URLs only from valid IDs", () => {
  assert.equal(getYouTubeWatchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(getYouTubeThumbnailUrl(ID), `https://i.ytimg.com/vi/${ID}/mqdefault.jpg`);
  assert.equal(getYouTubeThumbnailUrl(ID, "default"), `https://i.ytimg.com/vi/${ID}/default.jpg`);
  const embed = new URL(getEmbedUrl(ID, { autoplay: true, origin: "https://example.com" }));
  assert.equal(embed.hostname, "www.youtube-nocookie.com");
  assert.equal(embed.pathname, `/embed/${ID}`);
  assert.equal(embed.searchParams.get("autoplay"), "1");
  assert.equal(embed.searchParams.get("origin"), "https://example.com");
  const unsafeOrigin = new URL(getEmbedUrl(ID, { origin: "javascript:alert(1)" }));
  assert.equal(unsafeOrigin.searchParams.get("origin"), null);
  assert.throws(() => getEmbedUrl("bad"));
  assert.throws(() => getYouTubeWatchUrl('"><script>'));
  assert.throws(() => getYouTubeThumbnailUrl("x"));
});

test("maps player error codes", () => {
  assert.equal(mapPlayerErrorCode(2), "invalid");
  assert.equal(mapPlayerErrorCode(5), "playback");
  assert.equal(mapPlayerErrorCode(100), "unavailable");
  assert.equal(mapPlayerErrorCode(101), "embedding");
  assert.equal(mapPlayerErrorCode(150), "embedding");
  assert.equal(mapPlayerErrorCode(153), "unknown");
});
