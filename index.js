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
                core.setFailed(`Status must be "${statusMatch}". Found "${statusFound}".`);
            }
        })
        .catch(err => {
            console.error(err);
            core.setFailed(error.message);
        });
} catch (error) {
    core.setFailed(error.message);
}