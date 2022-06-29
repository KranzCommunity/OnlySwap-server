const crypto = require('crypto');
var fs = require("fs");
const setPassword = function(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash: hash, salt: salt };
};

const validatePassword = function(password, userHash, salt) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === userHash;
};

const verificationCode = function() {
	return Math.floor(1000 + Math.random() * 9000);
}

const random3digit = function() {
	return Math.floor(100 + Math.random() * 999);
}

var forEachAsync = (async function(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await (callback(array[index], index, array));
	}
});

const randomPassword = function(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

const convertToOldRewardFormat = async function(challengeData) {
  await forEachAsync(
    challengeData.data,
    async function (challenge, index) {
      let currentReward = challenge.Reward;
      let rewards = JSON.parse(challenge.Reward)
      var oldRewardFormat = {"first":"","second":"","third":""};
      await forEachAsync(
        rewards,
        async function (reward, rindex) {
          if(reward.rank == "1") {
            oldRewardFormat.first = reward.reward
          } else if(reward.rank == "2") {
            oldRewardFormat.second = reward.reward
          } else if(reward.rank == "3") {
            oldRewardFormat.third = reward.reward
          }
        }
      );
      challenge.Reward = JSON.stringify(oldRewardFormat);
      challenge.RewardNew = currentReward;
    }
  );
  return challengeData
}

const fileSaveSync = async (fullpath, data) => {
  try {
    var fs = require("fs");
    fs.writeFile(fullpath, data, function (err) {
      if (err) throw err;
      console.log('Saved!');
    })
    return true;
  } catch (err) {
    return false;
  }
}

var successRes = function(key){
  return {status:"success",msg:translateMsg(key), title:translateTitle(key)}
}

var failRes = function(key){
  return {status:"fail",msg:translateMsg(key), title:translateTitle(key)}
}

var translateMsg = function(key){
  return "api."+key+".msg"
}

var translateTitle = function(key){
  return "api."+key+".title"
}

module.exports = {
	setPassword: setPassword,
	validatePassword: validatePassword,
	verificationCode: verificationCode,
	random3digit: random3digit,
	forEachAsync: forEachAsync,
	randomPassword: randomPassword,
  convertToOldRewardFormat: convertToOldRewardFormat,
  fileSaveSync: fileSaveSync,
  successRes: successRes,
  failRes: failRes,
  translateMsg: translateMsg,
  translateTitle: translateTitle,
};
