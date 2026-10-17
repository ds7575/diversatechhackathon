function queryKey(value) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Cache successful and empty place searches by normalized destination-scoped
 * query. The supplied search function is the only provider-specific boundary.
 */
function createCachedPlaceSearch({ search, cache = new Map() }) {
  if (typeof search !== 'function') throw new TypeError('search must be a function');
  const inFlight = new Map();
  return async request => {
    if (!request || typeof request.query !== 'string' || !request.query.trim()) {
      throw new TypeError('request.query must be a nonempty string');
    }
    const key = queryKey(request.query);
    if (cache.has(key)) return cache.get(key);
    if (inFlight.has(key)) return inFlight.get(key);
    const work = Promise.resolve(search({ ...request, query: request.query.trim() }))
      .then(result => {
        if (result !== null && (typeof result !== 'object' || Array.isArray(result))) {
          throw new TypeError('search must return one place object or null');
        }
        cache.set(key, result);
        return result;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, work);
    return work;
  };
}

module.exports = { createCachedPlaceSearch, queryKey };
