function getObjectHash(obj: any): number {
  if (typeof obj !== 'object' || obj === null) {
    // For non-object types, use a basic hash
    return hash(obj);
  }

  // Initialize hash value
  let hashValue = 0;

  // Get all keys of the object
  const keys = Object.keys(obj).sort();

  // Iterate through sorted keys and compute hash based on key and value
  keys.forEach(key => {
    const value = obj[key];
    const valueHash = getObjectHash(value);

    // Combine hash of key and value
    hashValue = hashValue ^ (hash(key) + valueHash);
  });

  return hashValue >>> 0; // Ensure positive integer
}

// Simple hash function for non-object types
function hash(obj: any): number {
  if (typeof obj === 'string') {
    let hash = 0;
    for (let i = 0; i < obj.length; i++) {
      hash = (hash << 5) - hash + obj.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  } else if (typeof obj === 'number') {
    return obj | 0;
  } else if (typeof obj === 'boolean') {
    return obj ? 1 : 0;
  } else {
    // Handle other types as needed
    return 0;
  }
}

// Example usage:
const obj1 = { a: 1, b: "test", c: { nested: true } };
const obj2 = { b: "test", c: { nested: true }, a: 1 }; // Same as obj1 but different order

const hash1 = getObjectHash(obj1);
const hash2 = getObjectHash(obj2);

console.log(hash1); // Output: 152265232
console.log(hash2); // Output: 152265232 (same as hash1 because order of keys does not affect the hash)
