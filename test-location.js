// Test location extraction
const testCases = [
  "Bostancı final okullarında kahvaltı - 09:30",
  "Memorial Hastanesi'nde randevu saat 14:00",
  "Kadıköy'de alışveriş yapacağım",
  "Starbucks'ta toplantı var",
  "İstanbul Havalimanı'nda buluşma",
  "Zorlu Center'da konser",
  "Ataşehir Metropol İstanbul'da toplantı"
];

// Simulate what the AI should extract
testCases.forEach(test => {
  console.log("\n📝 Input:", test);
  
  // Check for location patterns
  const locationPatterns = [
    /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*(?:'[dDtTnN]?[aAeE])?)/g,
    /\b(?:okul|hastane|havalimanı|center|mall|park|plaza|tower)\w*/gi
  ];
  
  let locations = [];
  locationPatterns.forEach(pattern => {
    const matches = test.match(pattern);
    if (matches) {
      locations.push(...matches);
    }
  });
  
  // Filter and clean
  const knownLocations = [
    "Bostancı", "final okulları", "Memorial Hastanesi",
    "Kadıköy", "Starbucks", "İstanbul Havalimanı",
    "Zorlu Center", "Ataşehir", "Metropol İstanbul"
  ];
  
  const detectedLocation = locations.find(loc => 
    knownLocations.some(known => 
      loc.toLowerCase().includes(known.toLowerCase()) ||
      known.toLowerCase().includes(loc.toLowerCase())
    )
  );
  
  console.log("📍 Detected Location:", detectedLocation || "NONE");
  console.log("✅ Expected fields:");
  console.log("  - location:", detectedLocation);
  console.log("  - destination:", detectedLocation);
  console.log("  - requiresRouting:", !!detectedLocation);
});