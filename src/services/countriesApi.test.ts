import { describe, it, expect } from 'vitest';
import { getFlagUrl, getLowResFlagUrl, getEarthTextureUrls } from './countriesApi';

describe('countriesApi asset URLs', () => {
  it('returns high-resolution flag URL by default', () => {
    const url = getFlagUrl('BR');
    expect(url).toContain('flags/br.png');
    expect(url).not.toContain('flags/low/');
  });

  it('returns low-resolution flag URL when requested', () => {
    const url = getFlagUrl('BR', 'low');
    expect(url).toContain('flags/low/br.png');
  });

  it('returns low-resolution flag URL via getLowResFlagUrl helper', () => {
    const url = getLowResFlagUrl('JP');
    expect(url).toContain('flags/low/jp.png');
  });

  it('returns earth texture URLs for low and high resolutions', () => {
    const low = getEarthTextureUrls('low');
    const high = getEarthTextureUrls('high');

    expect(low.blueMarbleUrl).toContain('textures/low/earth-blue-marble.jpg');
    expect(low.topologyUrl).toContain('textures/low/earth-topology.png');

    expect(high.blueMarbleUrl).toContain('textures/earth-blue-marble.jpg');
    expect(high.topologyUrl).toContain('textures/earth-topology.png');
    expect(high.blueMarbleUrl).not.toContain('textures/low/');
  });
});
