const core = require('@actions/core');
const github = require('@actions/github');

(async () => {
    try {
        core.notice('Check File Action called!!!');
    } catch (error) {
        core.setFailed(error.message);
    }
})();