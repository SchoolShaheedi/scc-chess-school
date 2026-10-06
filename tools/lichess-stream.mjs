// Reading a Lichess database export as a stream of text lines (DECISIONS #85), without saving the download:
// the files are zstd, and the puzzle file is pzstd-style with "skippable frames" Node's decompressor stops at.
import { createZstdDecompress } from "node:zlib";
import { Readable, Transform } from "node:stream";
import { createInterface } from "node:readline";

// Every zstd frame may be preceded by a skippable frame (magic 0x184D2A50-5F + 4-byte length). Node stops dead at the
// first one, which reads as "0 rows" - so cut them out and pass only the real frames through.
export function stripSkippableFrames() {
  let buf = Buffer.alloc(0), passLeft = 0;
  return new Transform({
    transform(chunk, _enc, done) {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (passLeft > 0) {
          if (!buf.length) break;
          const n = Math.min(passLeft, buf.length);
          this.push(buf.subarray(0, n)); buf = buf.subarray(n); passLeft -= n; continue;
        }
        if (buf.length < 8) break;
        const magic = buf.readUInt32LE(0);
        if ((magic & 0xfffffff0) === 0x184d2a50) {
          const size = buf.readUInt32LE(4);
          if (buf.length < 8 + size) break;
          passLeft = size === 4 ? buf.readUInt32LE(8) : 0;   // pzstd keeps the next frame's size in the payload
          buf = buf.subarray(8 + size);
          if (!passLeft) { this.push(buf); buf = Buffer.alloc(0); passLeft = Infinity; }
        } else { passLeft = Infinity; }
      }
      done();
    },
  });
}

/** Lines of a remote .zst file. `stop()` ends the download early (the rest of the file is never fetched). */
export async function lichessLines(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`);
  let bytes = 0;
  const counted = Readable.fromWeb(res.body).on("data", c => { bytes += c.length; });
  const lines = createInterface({ input: counted.pipe(stripSkippableFrames()).pipe(createZstdDecompress()), crlfDelay: Infinity });
  return { lines, bytes: () => bytes, stop: () => { lines.close(); counted.destroy(); res.body.cancel().catch(() => {}); } };
}
