# Bitcoin Transaction Decoding : Assignment 3

## Files

- `manual-decode.md` : Task 1: field-by-field manual decode of the assignment transaction
- `decoder.js` : Task 2: a general-purpose transaction decoder function
- `output.txt` : the decoder's output when run against the assignment transaction hex
- `README.md` : this file

## How decoder.js works

decode_transaction(hex_string) reads the raw bytes and walks through them left to right, exactly in the order they're serialized:

1. Version : first 4 bytes, little-endian.
2. Marker / Flag : peeks at the next 2 bytes. If they're 00 01, this is a SegWit transaction using extended serialization, so those bytes are consumed as marker/flag. If not, the transaction is legacy and there's no marker/flag to read.
3. Inputs : reads a compactSize input count, then for each input:
   - 32-byte previous txid (stored internally little-endian; reversed for display, since Bitcoin shows txids in big-endian/display order)
   - 4-byte previous output index (vout)
   - compactSize scriptSig length, then that many bytes of scriptSig (empty for native SegWit inputs, since the unlocking data lives in the witness instead)
   - 4-byte sequence number
4. Outputs : reads a compactSize output count, then for each output:
   - 8-byte amount (satoshis, little-endian)
   - compactSize scriptPubKey length, then that many bytes of scriptPubKey
5. Witness data : only present if the marker/flag indicated SegWit. There's one witness stack per input (this isn't length-prefixed itself, it's implied by the input count). Each stack starts with a compactSize item count, then each item is length-prefixed.
6. Locktime : final 4 bytes, little-endian.

### CompactSize (varint) parsing

read_varint() implements Bitcoin's variable-length integer encoding:

| First byte | Total size | Meaning |
|---|---|---|
| 0x00–0xfc | 1 byte | value is the byte itself |
| 0xfd | 3 bytes | 0xfd + uint16 |
| 0xfe | 5 bytes | 0xfe + uint32 |
| 0xff | 9 bytes | 0xff + uint64 |

### Handles both legacy and SegWit

The function only reads marker/flag/witness fields when it actually finds the 00 01 marker/flag sequence right after the version — so a legacy transaction (no witness data, scriptSigs carrying the unlock data) parses correctly too, it just skips those steps.

### Validation

After parsing, the function reports bytes_consumed vs. total_bytes and a fully_parsed flag, so you can confirm that every byte of the transaction was accounted for and nothing was mis-parsed.

## Running it

 decoder.js

This decodes the assignment's transaction hex and prints the result as JSON (see output.txt for the captured output).

