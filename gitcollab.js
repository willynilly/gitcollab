var $ = require('jquery-browserify');
var _ = require('lodash');
var math = require('mathjs');

module.exports = {
	loadCommits: loadCommits,
	filterCommitsByCommitId: filterCommitsByCommitId,
	filterCommitsByRepoUrl: filterCommitsByRepoUrl,
	getContributionStats: getContributionStats,
	getCoauthorshipStats: getCoauthorshipStats,
	showContributionsByFile: showContributionsByFile,
	normalizeCommitsForAuthorEmailAliases: normalizeCommitsForAuthorEmailAliases,
	getJsonRepoLogUrlsFromRepoNames:getJsonRepoLogUrlsFromRepoNames
};

function loadCommits(repoLogJsonUrls, onLoadCallback) {
	var requests = [];
  var commits = [];
  _.forEach(repoLogJsonUrls, function(url) {
    requests.push($.getJSON(url, function(newCommits) {
      _.forEach(newCommits, function(commit) {
      	commit.repoUrl = url;
      });
			commits = commits.concat(newCommits);
    }));
	});
	
  $.when.apply($, requests).done(function() {
    console.log('commits', commits);
		onLoadCallback(commits);
  });
}

function normalizeCommitsForAuthorEmailAliases(authorEmailAliases, commits) {
	_.forEach(commits, function(commit) {
		var authorEmail = commit.author.email;
		console.log(authorEmail);
		if (authorEmail in authorEmailAliases) {
			commit.author.email = authorEmailAliases[authorEmail];
			console.log(commit);
		}
	});
	return commits;
}

function filterCommitsByCommitId(commits, commitId) {
	return _.filter(commits, function(commit) { 
		return commit.commit === commitId; 
	});
}

function filterCommitsByRepoUrl(commits, repoUrl) {
	return _.filter(commits, function(commit) { 
		return commit.repoUrl === repoUrl; 
	});
}

function getContributionStats(commits) {
	return _.reduce(commits, function(result, commit) {
		var repoUrl = commit.repoUrl;
		if (!(repoUrl in result)) {
			result[repoUrl] = {};
		}
		contributionsForRepo = result[repoUrl];
		
		var authorName = commit.author.name;
		var authorEmail = commit.author.email;
		var commitDate = commit.author.date;
		var fileChanges = commit.changes;
		_.forEach(fileChanges, function(fileChange) {
			var linesAdded = fileChange[0];
			var linesRemoved = fileChange[1];
			var fileName = fileChange[2];
			if (!(fileName in contributionsForRepo)) {
				contributionsForRepo[fileName] = {};
			}
			var contributionsForFile = contributionsForRepo[fileName];
			if (!(authorEmail in contributionsForFile)) {
				contributionsForFile[authorEmail] = {};
			}
			var contributionsByAuthor = contributionsForFile[authorEmail];
			if (!('totalAddedLines' in contributionsByAuthor)) {
				contributionsByAuthor.totalAddedLines = 0;
			}
			if (!('totalRemovedLines' in contributionsByAuthor)) {
				contributionsByAuthor.totalRemovedLines = 0;
			}
			if (!('changeHistory' in contributionsByAuthor)) {
				contributionsByAuthor.changeHistory = [];
			}
			contributionsByAuthor.totalAddedLines += linesAdded;
			contributionsByAuthor.totalRemovedLines += linesRemoved;
			contributionsByAuthor.changeHistory.push({
				linesAdded: linesAdded,
				linesRemoved: linesRemoved,
				date: commitDate
			});
		});
		
		return result;
	}, {});
}

function getCoauthorshipStats(contributionStats) {
	return _.reduce(contributionStats, function(result, contributionsByFile, repoUrl) {
		
		_.forEach(contributionsByFile, function(contributionsByFromAuthorEmail, fileName) {
			var authorEmailsForFile = _.keys(contributionsByFromAuthorEmail);
			_.forEach(contributionsByFromAuthorEmail, function(contribution, fromAuthorEmail) {
				_.forEach(authorEmailsForFile, function(toAuthorEmail) {
					if (toAuthorEmail !== fromAuthorEmail) {
						if (!(fromAuthorEmail in result)) {
							result[fromAuthorEmail] = {};
						}
						if (!(toAuthorEmail in result[fromAuthorEmail])) {
							result[fromAuthorEmail][toAuthorEmail] = {
								totalFiles: 0, 
								totalAddedLines: 0, 
								totalRemovedLines: 0 
							};
						}
						var stats = result[fromAuthorEmail][toAuthorEmail];
						stats.totalFiles += 1;
						stats.totalAddedLines += contribution.totalAddedLines;
						stats.totalRemovedLines += contribution.totalRemovedLines;
					}
				});
			});
		});
		
		
		
		return result;
	}, {});
}

function getJsonRepoLogUrlsFromRepoNames(repoNames) {
    var jsonRepoLogUrls = [];
    _.forEach(repoNames, function(repoName) {
      var url = 'logs/' + repoName + '-log.json';
      jsonRepoLogUrls.push(url);
    });
    return jsonRepoLogUrls;
  }

/* display functions */
function showContributionsByFile(contributionsByFile) {
	$('body').append('<div id="contributionsByFile"><ul></ul></div>');
	var contributionsByFileListElement = $('#contributionsByFile > ul');
	_.forEach(contributionsByFile,	function(contributions, fileName) {
		var fileNameListItemElement = $('<li>' + fileName + '</li>');
		fileNameListItemElement.appendTo(contributionsByFileListElement); 
		var authorListElement = $('<ul></ul>');
		authorListElement.appendTo(fileNameListItemElement);
		_.forEach(contributions, function(contribution, authorEmail) {
			var authorListItemElement = $('<li>' + authorEmail + '</li>');
			authorListItemElement.appendTo(authorListElement);
			var authorStatListElement = $('<ul></ul>');
			authorStatListElement.appendTo(authorListItemElement);
			authorStatListElement.append('<li>lines added: ' + contribution.totalAddedLines + '</li>');
			authorStatListElement.append('<li>lines removed: ' + contribution.totalRemovedLines + '</li>');
			//console.log(contribution);
		});
	});
}