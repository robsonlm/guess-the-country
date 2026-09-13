const fs = require('fs');
const path = require('path');
const https = require('https');

const STATES = [
  { code: 'AL', name: 'Alabama', capital: 'Montgomery', region: 'South', subregion: 'East South Central', nickname: 'The Yellowhammer State', lat: 32.8067, lng: -86.7911, file: 'File:Flag_of_Alabama.svg' },
  { code: 'AK', name: 'Alaska', capital: 'Juneau', region: 'West', subregion: 'Pacific', nickname: 'The Last Frontier', lat: 61.3707, lng: -152.4044, file: 'File:Flag_of_Alaska.svg' },
  { code: 'AZ', name: 'Arizona', capital: 'Phoenix', region: 'West', subregion: 'Mountain', nickname: 'The Grand Canyon State', lat: 33.7298, lng: -111.4312, file: 'File:Flag_of_Arizona.svg' },
  { code: 'AR', name: 'Arkansas', capital: 'Little Rock', region: 'South', subregion: 'West South Central', nickname: 'The Natural State', lat: 34.9697, lng: -92.3731, file: 'File:Flag_of_Arkansas.svg' },
  { code: 'CA', name: 'California', capital: 'Sacramento', region: 'West', subregion: 'Pacific', nickname: 'The Golden State', lat: 36.1162, lng: -119.6816, file: 'File:Flag_of_California.svg' },
  { code: 'CO', name: 'Colorado', capital: 'Denver', region: 'West', subregion: 'Mountain', nickname: 'The Centennial State', lat: 39.0598, lng: -105.3111, file: 'File:Flag_of_Colorado.svg' },
  { code: 'CT', name: 'Connecticut', capital: 'Hartford', region: 'Northeast', subregion: 'New England', nickname: 'The Constitution State', lat: 41.5978, lng: -72.7554, file: 'File:Flag_of_Connecticut.svg' },
  { code: 'DE', name: 'Delaware', capital: 'Dover', region: 'South', subregion: 'South Atlantic', nickname: 'The First State', lat: 39.3185, lng: -75.5071, file: 'File:Flag_of_Delaware.svg' },
  { code: 'FL', name: 'Florida', capital: 'Tallahassee', region: 'South', subregion: 'South Atlantic', nickname: 'The Sunshine State', lat: 27.7663, lng: -81.6868, file: 'File:Flag_of_Florida.svg' },
  { code: 'GA', name: 'Georgia', capital: 'Atlanta', region: 'South', subregion: 'South Atlantic', nickname: 'The Peach State', lat: 33.0406, lng: -83.6431, file: 'File:Flag_of_the_State_of_Georgia.svg' },
  { code: 'HI', name: 'Hawaii', capital: 'Honolulu', region: 'West', subregion: 'Pacific', nickname: 'The Aloha State', lat: 21.0943, lng: -157.4983, file: 'File:Flag_of_Hawaii.svg' },
  { code: 'ID', name: 'Idaho', capital: 'Boise', region: 'West', subregion: 'Mountain', nickname: 'The Gem State', lat: 44.2405, lng: -114.4788, file: 'File:Flag_of_Idaho.svg' },
  { code: 'IL', name: 'Illinois', capital: 'Springfield', region: 'Midwest', subregion: 'East North Central', nickname: 'The Prairie State', lat: 40.3495, lng: -88.9861, file: 'File:Flag_of_Illinois.svg' },
  { code: 'IN', name: 'Indiana', capital: 'Indianapolis', region: 'Midwest', subregion: 'East North Central', nickname: 'The Hoosier State', lat: 39.8494, lng: -86.2583, file: 'File:Flag_of_Indiana.svg' },
  { code: 'IA', name: 'Iowa', capital: 'Des Moines', region: 'Midwest', subregion: 'West North Central', nickname: 'The Hawkeye State', lat: 42.0115, lng: -93.2105, file: 'File:Flag_of_Iowa.svg' },
  { code: 'KS', name: 'Kansas', capital: 'Topeka', region: 'Midwest', subregion: 'West North Central', nickname: 'The Sunflower State', lat: 38.5266, lng: -96.7265, file: 'File:Flag_of_Kansas.svg' },
  { code: 'KY', name: 'Kentucky', capital: 'Frankfort', region: 'South', subregion: 'East South Central', nickname: 'The Bluegrass State', lat: 37.6681, lng: -84.6701, file: 'File:Flag_of_Kentucky.svg' },
  { code: 'LA', name: 'Louisiana', capital: 'Baton Rouge', region: 'South', subregion: 'West South Central', nickname: 'The Pelican State', lat: 31.1695, lng: -91.8678, file: 'File:Flag_of_Louisiana.svg' },
  { code: 'ME', name: 'Maine', capital: 'Augusta', region: 'Northeast', subregion: 'New England', nickname: 'The Pine Tree State', lat: 44.6939, lng: -69.3819, file: 'File:Flag_of_Maine.svg' },
  { code: 'MD', name: 'Maryland', capital: 'Annapolis', region: 'South', subregion: 'South Atlantic', nickname: 'The Old Line State', lat: 39.0639, lng: -76.8021, file: 'File:Flag_of_Maryland.svg' },
  { code: 'MA', name: 'Massachusetts', capital: 'Boston', region: 'Northeast', subregion: 'New England', nickname: 'The Bay State', lat: 42.2302, lng: -71.5301, file: 'File:Flag_of_Massachusetts.svg' },
  { code: 'MI', name: 'Michigan', capital: 'Lansing', region: 'Midwest', subregion: 'East North Central', nickname: 'The Great Lakes State', lat: 43.3266, lng: -84.5361, file: 'File:Flag_of_Michigan.svg' },
  { code: 'MN', name: 'Minnesota', capital: 'Saint Paul', region: 'Midwest', subregion: 'West North Central', nickname: 'The North Star State', lat: 45.6945, lng: -93.9002, file: 'File:Flag_of_Minnesota.svg' },
  { code: 'MS', name: 'Mississippi', capital: 'Jackson', region: 'South', subregion: 'East South Central', nickname: 'The Magnolia State', lat: 32.7416, lng: -89.6787, file: 'File:Flag_of_Mississippi.svg' },
  { code: 'MO', name: 'Missouri', capital: 'Jefferson City', region: 'Midwest', subregion: 'West North Central', nickname: 'The Show-Me State', lat: 38.4561, lng: -92.2884, file: 'File:Flag_of_Missouri.svg' },
  { code: 'MT', name: 'Montana', capital: 'Helena', region: 'West', subregion: 'Mountain', nickname: 'The Treasure State', lat: 46.9219, lng: -110.4544, file: 'File:Flag_of_Montana.svg' },
  { code: 'NE', name: 'Nebraska', capital: 'Lincoln', region: 'Midwest', subregion: 'West North Central', nickname: 'The Cornhusker State', lat: 41.1254, lng: -98.2681, file: 'File:Flag_of_Nebraska.svg' },
  { code: 'NV', name: 'Nevada', capital: 'Carson City', region: 'West', subregion: 'Mountain', nickname: 'The Silver State', lat: 38.3135, lng: -117.0554, file: 'File:Flag_of_Nevada.svg' },
  { code: 'NH', name: 'New Hampshire', capital: 'Concord', region: 'Northeast', subregion: 'New England', nickname: 'The Granite State', lat: 43.4525, lng: -71.5639, file: 'File:Flag_of_New_Hampshire.svg' },
  { code: 'NJ', name: 'New Jersey', capital: 'Trenton', region: 'Northeast', subregion: 'Mid-Atlantic', nickname: 'The Garden State', lat: 40.2989, lng: -74.5210, file: 'File:Flag_of_New_Jersey.svg' },
  { code: 'NM', name: 'New Mexico', capital: 'Santa Fe', region: 'West', subregion: 'Mountain', nickname: 'The Land of Enchantment', lat: 34.8405, lng: -106.2485, file: 'File:Flag_of_New_Mexico.svg' },
  { code: 'NY', name: 'New York', capital: 'Albany', region: 'Northeast', subregion: 'Mid-Atlantic', nickname: 'The Empire State', lat: 42.1657, lng: -74.9481, file: 'File:Flag_of_New_York.svg' },
  { code: 'NC', name: 'North Carolina', capital: 'Raleigh', region: 'South', subregion: 'South Atlantic', nickname: 'The Tar Heel State', lat: 35.6301, lng: -79.8064, file: 'File:Flag_of_North_Carolina.svg' },
  { code: 'ND', name: 'North Dakota', capital: 'Bismarck', region: 'Midwest', subregion: 'West North Central', nickname: 'The Peace Garden State', lat: 47.5289, lng: -99.7840, file: 'File:Flag_of_North_Dakota.svg' },
  { code: 'OH', name: 'Ohio', capital: 'Columbus', region: 'Midwest', subregion: 'East North Central', nickname: 'The Buckeye State', lat: 40.3888, lng: -82.7649, file: 'File:Flag_of_Ohio.svg' },
  { code: 'OK', name: 'Oklahoma', capital: 'Oklahoma City', region: 'South', subregion: 'West South Central', nickname: 'The Sooner State', lat: 35.5653, lng: -96.9289, file: 'File:Flag_of_Oklahoma.svg' },
  { code: 'OR', name: 'Oregon', capital: 'Salem', region: 'West', subregion: 'Pacific', nickname: 'The Beaver State', lat: 44.5720, lng: -122.0709, file: 'File:Flag_of_Oregon.svg' },
  { code: 'PA', name: 'Pennsylvania', capital: 'Harrisburg', region: 'Northeast', subregion: 'Mid-Atlantic', nickname: 'The Keystone State', lat: 40.5908, lng: -77.2098, file: 'File:Flag_of_Pennsylvania.svg' },
  { code: 'RI', name: 'Rhode Island', capital: 'Providence', region: 'Northeast', subregion: 'New England', nickname: 'The Ocean State', lat: 41.6809, lng: -71.5118, file: 'File:Flag_of_Rhode_Island.svg' },
  { code: 'SC', name: 'South Carolina', capital: 'Columbia', region: 'South', subregion: 'South Atlantic', nickname: 'The Palmetto State', lat: 33.8569, lng: -80.9450, file: 'File:Flag_of_South_Carolina.svg' },
  { code: 'SD', name: 'South Dakota', capital: 'Pierre', region: 'Midwest', subregion: 'West North Central', nickname: 'The Mount Rushmore State', lat: 44.2998, lng: -99.4388, file: 'File:Flag_of_South_Dakota.svg' },
  { code: 'TN', name: 'Tennessee', capital: 'Nashville', region: 'South', subregion: 'East South Central', nickname: 'The Volunteer State', lat: 35.7478, lng: -86.6923, file: 'File:Flag_of_Tennessee.svg' },
  { code: 'TX', name: 'Texas', capital: 'Austin', region: 'South', subregion: 'West South Central', nickname: 'The Lone Star State', lat: 31.0545, lng: -97.5635, file: 'File:Flag_of_Texas.svg' },
  { code: 'UT', name: 'Utah', capital: 'Salt Lake City', region: 'West', subregion: 'Mountain', nickname: 'The Beehive State', lat: 40.1500, lng: -111.8624, file: 'File:Flag_of_Utah.svg' },
  { code: 'VT', name: 'Vermont', capital: 'Montpelier', region: 'Northeast', subregion: 'New England', nickname: 'The Green Mountain State', lat: 44.0459, lng: -72.7107, file: 'File:Flag_of_Vermont.svg' },
  { code: 'VA', name: 'Virginia', capital: 'Richmond', region: 'South', subregion: 'South Atlantic', nickname: 'The Old Dominion State', lat: 37.7693, lng: -78.1700, file: 'File:Flag_of_Virginia.svg' },
  { code: 'WA', name: 'Washington', capital: 'Olympia', region: 'West', subregion: 'Pacific', nickname: 'The Evergreen State', lat: 47.4009, lng: -121.4905, file: 'File:Flag_of_Washington.svg' },
  { code: 'WV', name: 'West Virginia', capital: 'Charleston', region: 'South', subregion: 'South Atlantic', nickname: 'The Mountain State', lat: 38.4912, lng: -80.9545, file: 'File:Flag_of_West_Virginia.svg' },
  { code: 'WI', name: 'Wisconsin', capital: 'Madison', region: 'Midwest', subregion: 'East North Central', nickname: 'The Badger State', lat: 44.2685, lng: -89.6165, file: 'File:Flag_of_Wisconsin.svg' },
  { code: 'WY', name: 'Wyoming', capital: 'Cheyenne', region: 'West', subregion: 'Mountain', nickname: 'The Equality State', lat: 42.7560, lng: -107.3025, file: 'File:Flag_of_Wyoming.svg' },
  { code: 'DC', name: 'District of Columbia', capital: 'Washington', region: 'South', subregion: 'South Atlantic', nickname: "Nation's Capital", lat: 38.9072, lng: -77.0369, file: 'File:Flag_of_Washington,_D.C.svg' },
];

const FIPS_TO_CODE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR', '78': 'VI', '66': 'GU', '60': 'AS', '69': 'MP'
};

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GuessTheCountry/2.0 (education@guessthecountry.app)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl) => {
      https.get(targetUrl, { headers: { 'User-Agent': 'GuessTheCountry/2.0 (education@guessthecountry.app)' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download ${targetUrl}, status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

async function main() {
  console.log('1. Generating public/us_states.geojson with accurate alpha2 and centroids...');
  const topo = require('us-atlas/states-10m.json');
  const topojson = require('topojson-client');
  const geo = topojson.feature(topo, topo.objects.states);

  const roundCoords = (c) => {
    if (typeof c[0] === 'number') return [Math.round(c[0] * 10000) / 10000, Math.round(c[1] * 10000) / 10000];
    return c.map(roundCoords);
  };

  geo.features.forEach(f => {
    f.geometry.coordinates = roundCoords(f.geometry.coordinates);
    const code = FIPS_TO_CODE[f.id] || '';
    const alpha2 = code ? `US-${code}` : '';
    f.alpha2 = alpha2;
    f.properties = {
      ...f.properties,
      ISO_A2: alpha2,
      ISO_A2_EH: alpha2,
      WB_A2: alpha2,
      POSTAL: code,
      NAME: f.properties.name,
      ADMIN: f.properties.name,
    };
  });

  fs.writeFileSync('public/us_states.geojson', JSON.stringify(geo));
  console.log('Saved public/us_states.geojson (Size: ' + Math.round(fs.statSync('public/us_states.geojson').size / 1024) + ' KB)');

  console.log('2. Preparing US States dataset JSON...');
  const usStatesData = STATES.map(s => {
    const alpha2 = `US-${s.code}`;
    return {
      name: s.name,
      alpha2: alpha2,
      code: s.code,
      capital: s.capital,
      region: s.region,
      subregion: s.subregion,
      nickname: s.nickname,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ', USA')}`,
      flagUrl: `/flags/us-states/${s.code.toLowerCase()}.png`,
      lowFlagUrl: `/flags/us-states/low/${s.code.toLowerCase()}.png`,
      centroid: { lat: s.lat, lng: s.lng }
    };
  });

  fs.writeFileSync('src/data/usStatesData.json', JSON.stringify(usStatesData, null, 2));
  console.log('Saved src/data/usStatesData.json (' + usStatesData.length + ' states)');

  console.log('3. Querying Wikimedia Commons for all 51 state flags...');
  const titleToUrl = {};
  const titleToLowUrl = {};

  // Query in chunks of 20
  for (let i = 0; i < STATES.length; i += 20) {
    const chunk = STATES.slice(i, i + 20);
    const titles = chunk.map(s => s.file).join('|');
    const queryUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=320&redirects=1&format=json`;
    const queryLowUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=80&redirects=1&format=json`;

    const [result, resultLow] = await Promise.all([fetchJson(queryUrl), fetchJson(queryLowUrl)]);

    const recordPages = (data, map) => {
      if (data && data.query && data.query.pages) {
        Object.values(data.query.pages).forEach(page => {
          if (page.imageinfo && page.imageinfo[0]) {
            map[page.title] = page.imageinfo[0].thumburl;
          }
        });
      }
      if (data && data.query && data.query.normalized) {
        data.query.normalized.forEach(n => {
          if (map[n.to]) map[n.from] = map[n.to];
        });
      }
    };

    recordPages(result, titleToUrl);
    recordPages(resultLow, titleToLowUrl);
  }

  console.log('4. Downloading high & low flag images into public/flags/us-states/...');
  for (const s of STATES) {
    const normTitle = s.file.replace(/_/g, ' ');
    const highUrl = titleToUrl[normTitle] || titleToUrl[s.file];
    const lowUrl = titleToLowUrl[normTitle] || titleToLowUrl[s.file];

    const highDest = path.join('public/flags/us-states', `${s.code.toLowerCase()}.png`);
    const lowDest = path.join('public/flags/us-states/low', `${s.code.toLowerCase()}.png`);

    if (highUrl) {
      process.stdout.write(`Downloading ${s.name} (${s.code})... `);
      await downloadFile(highUrl, highDest);
      if (lowUrl) {
        await downloadFile(lowUrl, lowDest);
      }
      console.log('DONE');
    } else {
      console.warn(`Warning: Could not find Wikimedia URL for ${s.name} (${s.file})`);
    }
  }

  console.log('All US state setup tasks complete!');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
