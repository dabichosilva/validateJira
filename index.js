const core = require('@actions/core');
const github = require('@actions/github')
const JiraApi = require('jira-client')

try {
    let success = true
    const issueNumberInput = core.getInput('ticket_id');
    const statusMatchInput = core.getInput('expected_status');
    const targetBranchPrefixInput = core.getInput('targetBranchPrefix');
    const fixVersionsPrefixInput = core.getInput('fixVersionsPrefix');

    const fixVersionsPrefix = fixVersionsPrefixInput ? fixVersionsPrefixInput : "App v";
    const search = issueNumberInput ? issueNumberInput : process.env.GITHUB_HEAD_REF;
    const statusMatch = statusMatchInput ? statusMatchInput : 'Feature Testing Complete';
    const targetBranchPrefix = targetBranchPrefixInput ? targetBranchPrefixInput : 'release/v';

    const targetBranch = process.env.GITHUB_BASE_REF

    console.log(`Searching branch "${search}" for Jira issue number.`)

    const match = search.match(/([A-Za-z]+-\d+)/g);
    const issueNumber = match ? match[0] : null

    if (!issueNumber) {
        success = false
        return core.setFailed('No issue number found. Assuming not ready.');
    }

    console.log(`Issue number found: ${issueNumber}`)
    core.setOutput("issueNumber", issueNumber);

    let jira = new JiraApi({
        protocol: 'https',
        host: process.env.JIRA_BASE_URL,
        username: process.env.JIRA_USER_EMAIL,
        password: process.env.JIRA_API_TOKEN,
        apiVersion: '2',
        strictSSL: true
    });

    jira.findIssue(issueNumber)
        .then(issue => {
            const statusFound = issue.fields.status.name;
            
            console.log(`Status: ${statusFound}`);
            core.setOutput("status", statusFound);

            if (statusFound !== statusMatch) {
                success = false
                core.setFailed(`Status must be "${statusMatch}". Found "${statusFound}". We can't continue.`);
            } else {
                console.log(`Status of the ticket "${issueNumber}" is "${statusFound}", it is ok to continue.`);
            }

            if (issue.fields.fixVersions[0] == null){
                success = false
                core.setFailed(`FixVersions is not set in the Jira ticket ${issueNumber}. We can't continue.`)
            } else {
                const fixVersionsFound = issue.fields.fixVersions[0].name;
                const formattedFixVersions = fixVersionsFound.replace(fixVersionsPrefix, targetBranchPrefix)
                console.log(`The ticket "${issueNumber}" has a valid fixVersions field "${fixVersionsFound}", it is ok to continue.`);
                // if (targetBranch !== formattedFixVersions) {
                //     success = false
                //     core.setFailed(`Incorrect FixVersions found in the ticket! Current target branch is "${targetBranch}". Found this was intended for "${fixVersionsFound}". We can't continue.`);
                // } else {
                //     console.log(`The ticket targets the appropriate release branch "${targetBranch}", with FixVersions "${fixVersionsFound}", it is ok to continue.`);
                // }
            }


            if (success) console.log (`Jira related check passed!`)

        })
        .catch(err => {
            console.error(err);
            core.setFailed(err.message);
        });
} catch (error) {
    core.setFailed(error.message);
}