const sinon = require('sinon');

describe('Test method: master.init()', () => {
	test('Expect master.launch() to be called and master.init() to log start/exit', () => {
		const logger = require('./utils/logger');
		const spy = sinon.spy(logger, 'info');

		const master = require('./master');

		const stub = sinon.stub(master, 'launch');
		stub.resolves();

		const options = {
			protocol: "Ethereum",
			maxWallets: 1
		};

		master.init(options);
		sinon.assert.called(stub);
		sinon.assert.called(spy);
		sinon.assert.calledWith(spy, 'Started executing master.init()');
		sinon.assert.calledWith(spy, 'master.init(): Initializing master for Ethereum');
		sinon.assert.calledWith(spy, 'master.init(): A new publisher will be spawned for every 1 wallets..');
		sinon.assert.calledWith(spy, 'Exited master.init()');

		spy.restore();
		stub.restore();

	});

	test('Expect master.init() to throw an error (maxWallets)', () => {
		const logger = require('./utils/logger');
		const spy = sinon.spy(logger, 'error');

		const master = require('./master');

		const options = {
			protocol: "Ethereum",
			maxWallets: 0
		};

		master.init(options);
		sinon.assert.called(spy);
		sinon.assert.calledWith(spy, 'master.init() failed: Invalid configuration parameter maxWallets');

		spy.restore();
	});
});
