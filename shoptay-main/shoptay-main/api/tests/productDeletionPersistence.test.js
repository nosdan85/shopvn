const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shopRoutesSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'shopRoutes.js'), 'utf8');

test('public product fetch does not recreate deleted combo products', () => {
    const productsHandlerStart = shopRoutesSource.indexOf("router.get('/products'");
    const productsHandlerEnd = shopRoutesSource.indexOf("router.get('/proofs'");
    const productsHandler = shopRoutesSource.slice(productsHandlerStart, productsHandlerEnd);

    assert.notEqual(productsHandlerStart, -1);
    assert.notEqual(productsHandlerEnd, -1);
    assert.equal(productsHandler.includes('ensureSplitComboProducts'), false);
});
