function readVarint(data, offset) {
  const first = data[offset];
  if (first < 0xfd) {
    return { value: first, offset: offset + 1 };
  } else if (first === 0xfd) {
    return { value: data.readUInt16LE(offset + 1), offset: offset + 3 };
  } else if (first === 0xfe) {
    return { value: data.readUInt32LE(offset + 1), offset: offset + 5 };
  } else {
    return { value: Number(data.readBigUInt64LE(offset + 1)), offset: offset + 9 };
  }
}

function decodeTransaction(hexString) {
  const data = Buffer.from(hexString, 'hex');
  let offset = 0;
  const result = {};

  // Version (4 bytes, little-endian)
  result.version = data.readUInt32LE(offset);
  offset += 4;

  // Check for SegWit marker + flag
  let isSegwit = false;
  if (data[offset] === 0x00 && data[offset + 1] === 0x01) {
    isSegwit = true;
    result.marker = data[offset].toString(16).padStart(2, '0');
    result.flag = data[offset + 1].toString(16).padStart(2, '0');
    offset += 2;
  } else {
    result.marker = null;
    result.flag = null;
  }

  // Input count
  let v = readVarint(data, offset);
  const inputCount = v.value;
  offset = v.offset;
  result.input_count = inputCount;

  const inputs = [];
  for (let i = 0; i < inputCount; i++) {
    const txidLE = data.slice(offset, offset + 32);
    const txidDisplay = Buffer.from(txidLE).reverse().toString('hex');
    offset += 32;

    const vout = data.readUInt32LE(offset);
    offset += 4;

    v = readVarint(data, offset);
    const scriptLen = v.value;
    offset = v.offset;
    const scriptSig = data.slice(offset, offset + scriptLen).toString('hex');
    offset += scriptLen;

    const sequence = data.readUInt32LE(offset);
    offset += 4;

    inputs.push({
      txid: txidDisplay,
      vout: vout,
      script_length: scriptLen,
      scriptSig: scriptSig || "(empty - witness data used instead)",
      sequence: '0x' + sequence.toString(16)
    });
  }
  result.inputs = inputs;

  // Output count
  v = readVarint(data, offset);
  const outputCount = v.value;
  offset = v.offset;
  result.output_count = outputCount;

  const outputs = [];
  for (let i = 0; i < outputCount; i++) {
    const amount = Number(data.readBigUInt64LE(offset));
    offset += 8;

    v = readVarint(data, offset);
    const scriptLen = v.value;
    offset = v.offset;
    const scriptPubKey = data.slice(offset, offset + scriptLen).toString('hex');
    offset += scriptLen;

    outputs.push({
      amount_satoshis: amount,
      amount_btc: amount / 100_000_000,
      script_length: scriptLen,
      scriptPubKey: scriptPubKey
    });
  }
  result.outputs = outputs;

  // Witness data (only if segwit)
  const witnessData = [];
  if (isSegwit) {
    for (let i = 0; i < inputCount; i++) {
      v = readVarint(data, offset);
      const itemCount = v.value;
      offset = v.offset;
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        v = readVarint(data, offset);
        const itemLen = v.value;
        offset = v.offset;
        const item = data.slice(offset, offset + itemLen).toString('hex');
        offset += itemLen;
        items.push(item);
      }
      witnessData.push(items);
    }
  }
  result.witness = witnessData;

  // Locktime (4 bytes, little-endian)
  const locktime = data.readUInt32LE(offset);
  offset += 4;
  result.locktime = locktime;

  // sanity check
  result.bytes_consumed = offset;
  result.total_bytes = data.length;
  result.fully_parsed = (offset === data.length);

  return result;
}

// Test with provided transaction
const txHex = "0200000000010131811cd355c357e0e01437d9bcf690df824e9ff785012b6115dfae3d8e8b36c10100000000fdffffff0220a107000000000016001485d78eb795bd9c8a21afefc8b6fdaedf718368094c08100000000000160014840ab165c9c2555d4a31b9208ad806f89d2535e20247304402207bce86d430b58bb6b79e8c1bbecdf67a530eff3bc61581a1399e0b28a741c0ee0220303d5ce926c60bf15577f2e407f28a2ef8fe8453abd4048b716e97dbb1e3a85c01210260828bc77486a55e3bc6032ccbeda915d9494eda17b4a54dbe3b24506d40e4ff43030e00";

const decoded = decodeTransaction(txHex);
console.log(JSON.stringify(decoded, null, 2));
