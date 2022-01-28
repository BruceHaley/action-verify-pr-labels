const core = require('@actions/core');
const github = require('@actions/github');

const getPullRequestNumber = (ref) => {
  core.debug(`Parsing ref: ${ref}`);
  // This assumes that the ref is in the form of `refs/pull/:prNumber/merge`
  const prNumber = ref.replace(/refs\/pull\/(\d+)\/merge/, '$1');
  return parseInt(prNumber, 10);
};

(async () => {
  try {
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const ref = github.context.ref;
    const prNumber = github.context.issue.number || getPullRequestNumber(ref);
    const gitHubToken = core.getInput('github-token', { required: true });
    const octokit = new github.getOctokit(gitHubToken);

    const validLabels = ["enhancement","label 2","label 3"];

    const getPrLabels = async (prNumber) => {
      const { data } = await octokit.pulls.get({
        pull_number: prNumber,
        owner,
        repo,
      });
      if (data.length === 0) {
        throw new Error(`No Pull Requests found for ${prNumber} (${ref}).`);
      }
      return data.labels.map((label) => label.name);
    };

    const prLabels = await getPrLabels(prNumber);
    core.debug(`Found PR labels: ${prLabels.toString()}`);

    var prValidLabels = new Array();

    foreach (label in prLabels)
    {
      if (validLabels.includes(label))
      {
        prValidLabels.push(label);
      }
    }
    
    if (prValidLabels.length > 0) {
      core.info(`Pull Request has at least one valid label.`);
    }
    else
    {
      core.info(`Required is one or more of these labels: ` + validLabels.toString());
      throw "no labels";
    }

    return 0;
  } catch (error) {
    await core.setFailed(error.stack || error.message);
  }
})();
