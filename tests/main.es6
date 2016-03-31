import upgrade from 'specs/upgrade.spec';

mocha.setup('tdd');
chai.config.truncateThreshold = 0;

suite('RPG Ambience Soundboard', () => {
    suite('Upgrade', upgrade);
});

mocha.checkLeaks();
mocha.run();
