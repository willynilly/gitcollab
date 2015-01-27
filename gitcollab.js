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
		onLoadCallback(commits);
  });
}

function normalizeCommitsForAuthorEmailAliases(authorEmailAliases, commits) {
	_.forEach(commits, function(commit) {
		var authorEmail = commit.author.email;
		if (authorEmail in authorEmailAliases) {
			commit.author.email = authorEmailAliases[authorEmail];
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

function getChangeHistoryForFile(repoUrl, fileName, contributionStats) {
	var changeHistoryForFile = [];
	if (repoUrl in contributionStats && fileName in contributionStats[repoUrl]) {
		contributionsByAuthorEmail = contributionStats[repoUrl][fileName];
		_.forEach(contributionsByAuthorEmail, function(contribution, authorEmail) {
			var changeHistoryByAuthorEmail = _.map(contribution.changeHistory, function(change) {
				change.authorEmail = authorEmail;
				return change;
			});
			_.forEach(changeHistoryByAuthorEmail, function(change) {
				changeHistoryForFile.push(change);
			});
		});
		changeHistoryForFile = _.sortByAll(changeHistoryForFile, ['date', 'authorEmail']);
	}
	return changeHistoryForFile;
}

function getCoauthorshipStats(contributionStats) {
	return _.reduce(contributionStats, function(result, contributionsByFile, repoUrl) {
		_.forEach(contributionsByFile, function(contributionsByFromAuthorEmail, fileName) {
			var authorEmailsForFile = _.keys(contributionsByFromAuthorEmail);
			var changeHistoryForFile = getChangeHistoryForFile(repoUrl, fileName, contributionStats);
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
								totalRemovedLines: 0,
								timeGapHistoryForClosestChanges: [],
								totalTimeBetweenClosestChanges: 0
							};
						}
						var stats = result[fromAuthorEmail][toAuthorEmail];
						stats.totalFiles += 1;
						stats.totalAddedLines += contribution.totalAddedLines;
						stats.totalRemovedLines += contribution.totalRemovedLines;

						var newTimeGapHistory = getTimeGapHistoryForClosestChanges(fromAuthorEmail, toAuthorEmail, changeHistoryForFile);
						stats.totalTimeBetweenClosestChanges += getTotalTimeBetweenClosestChanges(newTimeGapHistory);
						_.forEach(newTimeGapHistory, function(timeGap) {
							stats.timeGapHistoryForClosestChanges.push(timeGap);
						});
						stats.timeGapHistoryForClosestChanges = _.sortByAll(stats.timeGapHistoryForClosestChanges, ['endDate']);
					}
				});
			});
		});
		return result;
	}, {});
}

function _getNextChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, changeIndex) {
	// find the next change by other author email if it exist
	var nextChangeByOtherAuthorEmail = null;
	var curChange = null;
 	for (var j = changeIndex; j < changeHistoryForFile.length; j++) {
 		curChange = changeHistoryForFile[j];
 		if (curChange.authorEmail === otherAuthorEmail) {
 			nextChangeByOtherAuthorEmail = curChange;
 		}
 	}
 	return nextChangeByOtherAuthorEmail;
}

function _getPrevChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, changeIndex) {
	// find the next change by other author email if it exist
	var prevChangeByOtherAuthorEmail = null;
	var curChange = null;
 	for (var j = changeIndex; j >= 0; j--) {
 		curChange = changeHistoryForFile[j];
 		if (curChange.authorEmail === otherAuthorEmail) {
 			prevChangeByOtherAuthorEmail = curChange;
 		}
 	}
 	return prevChangeByOtherAuthorEmail;
}

function _getClosestChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, changeByAuthorEmailIndex) {
	var curChangeByAuthorEmail = changeHistoryForFile[changeByAuthorEmailIndex];
	var prevChangeByOtherAuthorEmail = _getPrevChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, changeByAuthorEmailIndex);
	var nextChangeByOtherAuthorEmail = _getNextChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, changeByAuthorEmailIndex);
	if (prevChangeByOtherAuthorEmail) {
		if (nextChangeByOtherAuthorEmail) {
			var prevChangeDuration = math.abs(prevChangeByOtherAuthorEmail.date - curChangeByAuthorEmail.date);
			var nextChangeDuration = math.abs(nextChangeByOtherAuthorEmail.date - curChangeByAuthorEmail.date);
			if (prevChangeDuration <= nextChangeDuration) {
				return prevChangeByOtherAuthorEmail;
			} else {
				return nextChangeByOtherAuthorEmail;
			}
		} else {
			return prevChangeByOtherAuthorEmail;
		}
	} else if (nextChangeByOtherAuthorEmail) {
		return nextChangeByOtherAuthorEmail;
	} else {
		return null;
	}
}

function getTimeGapHistoryForClosestChanges(authorEmail, otherAuthorEmail, changeHistoryForFile) {
	// this method assumes that changeHistoryForFile is ordered
	// by the date of the changes in ascending order

	// for each of changes to this file by authorEmail, 
	// discover the time gap between it and the most recent previous commit by otherAuthorEmail
	var hasNoClosestChange = false;
	var timeGapHistoryForClosestChanges = _.reduce(changeHistoryForFile, function(result, change, i) {
		 if (hasNoClosestChange) {
		 	return result;
		 }
		 if (change.authorEmail === authorEmail) {
			var closestChangeByOtherAuthorEmail = _getClosestChangeByOtherAuthorEmail(otherAuthorEmail, changeHistoryForFile, i);
		 	if (closestChangeByOtherAuthorEmail) {
		 		// record the time gap between the change by fromAuthorEmail
		 		// and the most recent previous change by toAuthorEmail
		 		var otherAuthorDate = closestChangeByOtherAuthorEmail.date;
		 		var authorDate = change.date;
		 		var timeGap = {
		 			authorDate: authorDate,
		 			otherAuthorDate: otherAuthorDate,
		 			authorEmail: authorEmail,
		 			otherAuthorEmail: otherAuthorEmail,
		 			duration: math.abs(otherAuthorDate - authorDate)
		 		};
		 		// find the time difference between the change by authorEmail
		 		// and the most recent previous change by otherAuthorEmail
		 		result.push(timeGap);  
		 	} else {
		 		hasNoClosestChange = true;
		 	}
		 }
		 return result;
	}, []);
	return timeGapHistoryForClosestChanges;
}

function getTotalTimeBetweenClosestChanges(timeGapHistoryForClosestChanges) {
	return _.reduce(timeGapHistoryForClosestChanges, function(result, timeGap) {
		result += timeGap.duration;
		return result; 
	}, 0);
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
		});
	});
}