export interface PlaygroundArchiveEntry {
  name: string;
  content: string;
}

export const PLAYGROUND_DOWNLOAD_PORT_TOKEN = "PlaygroundDownloadPort";

export interface IPlaygroundDownloadPort {
  downloadArchive(baseName: string, entries: PlaygroundArchiveEntry[]): void;
}

export class BrowserPlaygroundDownloadPort implements IPlaygroundDownloadPort {
  downloadArchive(baseName: string, entries: PlaygroundArchiveEntry[]): void {
    const zip = buildZip(entries);
    const url = URL.createObjectURL(zip);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}-example.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

function buildZip(entries: PlaygroundArchiveEntry[]): Blob {
  const encoder = new TextEncoder();
  const modifiedAt = toZipDateTime(new Date());
  const files = entries.map((entry) => {
    const data = encoder.encode(entry.content);

    return {
      name: encoder.encode(entry.name),
      data,
      crc32: crc32(data),
    };
  });

  const centralHeaders: Uint8Array[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const localHeader = new Uint8Array(30 + file.name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(10, modifiedAt.time, true);
    localView.setUint16(12, modifiedAt.date, true);
    localView.setUint32(14, file.crc32, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, file.name.length, true);
    localHeader.set(file.name, 30);

    localParts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + file.name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(12, modifiedAt.time, true);
    centralView.setUint16(14, modifiedAt.date, true);
    centralView.setUint32(16, file.crc32, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, file.name.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(file.name, 46);
    centralHeaders.push(centralHeader);

    offset += localHeader.length + file.data.length;
  }

  const centralSize = centralHeaders.reduce(
    (sum, header) => sum + header.length,
    0,
  );
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob(
    [...localParts, ...centralHeaders, endRecord].map(
      (part) => new Uint8Array(part.buffer as ArrayBuffer),
    ),
    { type: "application/zip" },
  );
}

function toZipDateTime(date: Date): { date: number; time: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  };
}

const CRC32_TABLE = buildCrc32Table();

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
