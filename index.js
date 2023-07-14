const core = require('@actions/core');
const github = require('@actions/github')
const JiraApi = require('jira-client')

try {
    const issueNumberInput = core.getInput('ticket_id');
    const statusMatchInput = core.getInput('expected_status');
    console.log(`issueNumberInput = [${issueNumberInput}]`)
    console.log(`statusMatchInput = [${statusMatchInput}]`)

    const search = issueNumberInput ? issueNumberInput : process.env.GITHUB_HEAD_REF;
    const statusMatch = statusMatchInput ? statusMatchInput : 'Feature Testing Complete';

    console.log(`Searching "${search}" for Jira issue number.`)
    console.log(`updated this job`)

    const match = search.match(/([A-Za-z]{2,4}-\d{1,})/g)
    const issueNumber = match ? match[0] : null

    if (!issueNumber) {
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
                core.setFailed(`Status must be "${statusMatch}". Found "${statusFound}". We can't continue.`);
            } else {
                console.log(`Status of the ticket "${issueNumber}" is "${statusFound}", it is ok to continue.`);
            }

            const fixVersionsFound = issue.fields.fixVersions[0].name;
            const formattedFixVersions = fixVersionsFound.replace(fixVersionsPrefix, targetBranchPrefix)
            console.log (`fixVersionsFound = ${fixVersionsFound}`)
            console.log (`formattedFixVersions = ${formattedFixVersions}`)
            
            if (targetBranch !== formattedFixVersions) {
                core.setFailed(`Incorrect or empty Fix Versions found in the ticket! Current target branch is "${targetBranch}". Found this was intended for "${fixVersionsFound}". We can't continue.`);
            } else {
                console.log(`The ticket targets the appropriate release branch "${targetBranch}", with FixVersions "${fixVersionsFound}", it is ok to continue.`);
            }

            console.log (`Jira related check passed!`)

        })
        .catch(err => {
            console.error(err);
            core.setFailed(err.message);
        });
} catch (error) {
    core.setFailed(error.message);
}