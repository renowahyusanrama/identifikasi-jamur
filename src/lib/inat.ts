const DEFAULT_BASE_URL = 'https://api.inaturalist.org/v1';

export interface IdentifyResult {
  latinName: string;
  localName: string;
}

interface IdentifyOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export async function identifyWithINat(options: IdentifyOptions): Promise<IdentifyResult> {
  const base = (process.env.INAT_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const endpoint = `${base}/computervision/score_image`;

  const formData = new FormData();
  const blob = new Blob([options.buffer], { type: options.contentType });
  formData.append('image', blob, options.filename || 'upload');

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(`iNaturalist CV gagal (${response.status}): ${errorText || response.statusText}`);
  }

  const payload = await response.json();
  const top = payload?.results?.[0];
  const taxon = top?.taxon;

  if (!taxon) {
    throw new Error('Tidak ada prediksi yang diterima dari iNaturalist.');
  }

  const latinName: string | undefined = taxon.name || taxon.scientific_name;
  const localName: string | undefined =
    taxon.preferred_common_name || taxon.common_name?.name || taxon.common_name;

  return {
    latinName: latinName || 'Nama latin tidak ditemukan',
    localName: localName || 'Nama lokal belum tersedia'
  };
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
