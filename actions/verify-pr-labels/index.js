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

    const validLabels = ["enhancement","label 2","label 3","lets target labels"];

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

    // Check which of the label in the pull request, are in the list of valid labels
    const prValidLabels = prLabels.filter(value => validLabels.includes(value));

    if (prValidLabels.length > 0) {
      core.info(`Pull Request has at least one valid label.`);
    }
    else {
      core.info(`Required is at least one of these labels: ` + validLabels.join(', '));
      throw "no labels";
    }

    // Check whether a validated label targets this repo.
    // core.info(`this repo: ` + repo);

    const labelTargetingRepo = prValidLabels.find(element => {
      var splitString = element.split(' ');
      var lastWord = splitString[splitString.length - 1];
      if ( repo.toLowerCase().includes(lastWord.toLowerCase())) {
        return true;
      }
    });

    core.info(`Required is at least one of these labels: ` + validLabels.join(', '));

    if (labelTargetingRepo == null) {
      core.info(`No labels target this repo: ` + repo);
    }
    else {
      core.info(`Forbidden label: This label targets this repo: ` + labelTargetingRepo);
      throw "forbidden label";
    }

    return 0;
  } catch (error) {
    await core.setFailed(error.stack || error.message);
  }
})();
