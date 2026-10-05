import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import sharp from "sharp";

test("pool derivatives retain dimensions, bounded bytes and share-alike rights", async () => {
  for(const width of [480,960]) {
    const filename=`src/images/photos/barton-springs-${width}.webp`;
    const meta=await sharp(filename).metadata();
    assert.equal(meta.width,width);assert.equal(meta.height,width/3);
    assert.ok(statSync(filename).size<=100000);
  }
  const rights=readFileSync("src/images/photos/LICENSE.txt","utf8");
  assert.match(rights,/Fredlyfish4/);assert.match(rights,/CC BY-SA 4\.0/);
  assert.match(rights,/Both derivatives are distributed/);
  assert.match(rights,/cropped, resized/);
});
