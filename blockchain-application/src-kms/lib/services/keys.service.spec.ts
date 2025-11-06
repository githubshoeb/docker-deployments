import { KeysService } from './keys.service';

describe('KeysService', () => {
  let service: KeysService;

  beforeEach(() => {
    service = new KeysService();
  });

  it('should normalize S value correctly', () => {
    const sBufferHi =
      'fcf9e5b2a8fa951e506e69b54f4bd868f1c93b85ee0011eec9ec5c708498585e';
    const expectedSBufferLo =
      '03061a4d57056ae1af91964ab0b42795c8e5a160c1488e4cf5e6021c4b9de8e3';

    const normalizedS = service['normalizeS'](sBufferHi); // Accessing private method for test purpose

    expect(normalizedS).toBe(expectedSBufferLo);
  });

  it('should convert "Low" s ASN.1 signature to P1363 correctly', () => {
    const signatureAsn1Base64 =
      'MEQCICTfgzylgrlhiNEK/bXgz48fv828is9OdQxN2pkDPolsAiBP92yyQCQwSSCUTx09JAw00M3wWXMfnGLO+y4Gds2cXA=';

    // "Low" r
    const rBuffer =
      '24df833ca582b96188d10afdb5e0cf8f1fbfcdbc8acf4e750c4dda99033e896c';
    // "Low" s
    const sBuffer =
      '4ff76cb24024304920944f1d3d240c34d0cdf059731f9c62cefb2e0676cd9c5c';
    const expectedP1363Signature = `${rBuffer}${sBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });

  it('should convert "High" s ASN.1 signature to P1363 correctly', () => {
    const signatureAsn1Base64 =
      'MEUCIASKOyv1PF6jyESy1sl5/OYzwVBegblC/bTX0+1kUdJ9AiEA/Pnlsqj6lR5Qbmm1T0vYaPHJO4XuABHuyexccISYWF4=';

    // "Low" r
    const rBuffer =
      '048a3b2bf53c5ea3c844b2d6c979fce633c1505e81b942fdb4d7d3ed6451d27d';

    // "High" s are normalized, see https://github.com/RustCrypto/elliptic-curves/issues/991
    const normalizedSBuffer =
      '03061a4d57056ae1af91964ab0b42795c8e5a160c1488e4cf5e6021c4b9de8e3';

    const expectedP1363Signature = `${rBuffer}${normalizedSBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });

  it('should convert "High" r ASN.1 signature to P1363 correctly', () => {
    const signatureAsn1Base64 =
      'MEUCIQDysG64gheI8JxYfS+RmO6ppPVYZacx0aVGRF++Amnj1gIgdfIzEdpfakpaMvDwMEfrAYqYLiUWXt372Lvrqc8mohk=';

    // "High" r
    const rBuffer =
      'f2b06eb8821788f09c587d2f9198eea9a4f55865a731d1a546445fbe0269e3d6';
    // "Low" s
    const sBuffer =
      '75f23311da5f6a4a5a32f0f03047eb018a982e25165eddfbd8bbeba9cf26a219';
    const expectedP1363Signature = `${rBuffer}${sBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });

  it('should convert "High" r & "High" s ASN.1 signature to P1363 correctly', () => {
    const signatureAsn1Base64 =
      'MEYCIQCAf2B+txlyCj7uxuSr5DefJ7cZsmC1ZaJJfYUpb/sk9wIhAM/f2mVwgHf+6FkGghXmxzFfmaWPWPVu2Wq0QMs4+mgo';

    // "High" r
    const rBuffer =
      '807f607eb719720a3eeec6e4abe4379f27b719b260b565a2497d85296ffb24f7';
    // "High" s
    const normalizedSBuffer =
      '3020259a8f7f880117a6f97dea1938cd5b15375756533162551e1dc1973bd919';
    const expectedP1363Signature = `${rBuffer}${normalizedSBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });

  it('should convert 31 bytes (62 chars) r test case correctly', () => {
    const signatureAsn1Base64 =
      'MEQCHwVewc5vYBh0uANEVnch5Qq7kLaD9ojDPWNz8ixzifsCIQCR0o9yhPjSguxHde3zycL+0Qz3jvblvQ8Xsbp6uCc4SA==';

    // This r buffer should remain padded with leading 00 > 32 bytes (64 chars)
    const rBuffer =
      '00055ec1ce6f601874b80344567721e50abb90b683f688c33d6373f22c7389fb';
    const sBuffer =
      '6e2d708d7b072d7d13b88a120c363cffe9a1e557b862e32ca820a412180f08f9';
    const expectedP1363Signature = `${rBuffer}${sBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });

  it('should convert 31 bytes (62 chars) s case correctly', () => {
    const signatureAsn1Base64 =
      'MEMCIAg0RobWi8vhwDWSTdzefp4o3mxkKpgczp85G8b+6/XQAh8Vt9XaUSrPP7aAtcDr6V2LJYPlKrJvknUVL7xlMR5o';

    const rBuffer =
      '08344686d68bcbe1c035924ddcde7e9e28de6c642a981cce9f391bc6feebf5d0';
    // This s buffer should remain padded with leading 00 > 32 bytes (64 chars)
    const sBuffer =
      '0015b7d5da512acf3fb680b5c0ebe95d8b2583e52ab26f9275152fbc65311e68';
    const expectedP1363Signature = `${rBuffer}${sBuffer}`;

    const result = service['convertSignatureAsn1ToP1363'](signatureAsn1Base64);

    expect(result).toBe(expectedP1363Signature);
  });
});
