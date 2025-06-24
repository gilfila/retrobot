const { App, LogLevel } = require("@slack/bolt");
const {
  buildAuthorization,
  getUserSummary,
  getGame,
  getGameInfoAndUserProgress,
} = require("@retroachievements/api");

const fetch = require("node-fetch");

global.fetch = fetch;
const userName = process.env.RETRO_USERNAME;
const webApiKey = process.env.RETRO_TOKEN;

const authorization = buildAuthorization({ userName, webApiKey });

const axios = require("axios");
const { JSDOM } = require("jsdom");

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.INFO,
});

const userList = [
  { username: "musashi810", realName: "Tony", userid: "UGY7D3N58" },
  { username: "Mohulis", realName: "Graf", userid: "UGZ2FQGVC" },
  { username: "strayrooster", realName: "Joe", userid: "UGXCQFAHG" },
  { username: "Rezzik", realName: "Brian", userid: "UGYSG2CES" },
  { username: "grampa", realName: "Alex", userid: "UGVHD3N72" },
  // Add more users to the list
];

app.event("app_mention", async ({ event, client }) => {
  try {
    let blocks = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "Current Scores:",
          emoji: true,
        },
      },
    ];

    for (const user of userList) {
      // This gets the user's 10 most recently played games.

      const userInformation = await getUserSummary(authorization, {
        userName: user.username,
      });

      // Post user information to Slack channel
      const channel = event.channel;
      const message = `User: ${userInformation.user}\nScore: ${userInformation.richPresenceMsg}`;
      const lastGameId = userInformation.lastGameId;

      const userRecentAchievements = await getGameInfoAndUserProgress(
        authorization,
        {
          userName: user.username,
          gameId: lastGameId,
        }
      );

      const mostRecentAchievement = getMostRecentAchievement(
        userRecentAchievements
      );
      console.log(
        "MOST RECENT ACHIEVEMENT:" + JSON.stringify(userRecentAchievements)
      );

      const game = await getGame(authorization, { gameId: lastGameId });
      const messageBlock = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*User:* ${userInformation.user}\n` +
              `*SoftCore Points:* ${userInformation.totalSoftcorePoints}\n` +
              `*HardCore Points:* ${userInformation.totalPoints}\n` +
              `*Last Game:* ${game.title}\n` +
              `*Last Seen:* ${userInformation.richPresenceMsg}\n` +
              `*Last Achievement:* ${
                mostRecentAchievement
                  ? mostRecentAchievement.description
                  : "No recent achievement found"
              }`,
          },
          accessory: {
            type: "image",
            image_url: `https://retroachievements.org/${game.gameIcon}`,
            alt_text: "computer thumbnail",
          },
        },
      ];

      await client.chat.postMessage({
        channel: channel,
        blocks: messageBlock,
        text: "",
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

app.event("reaction_added", async ({ event, client }) => {
  try {
    let blocks = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "Current Scores:",
          emoji: true,
        },
      },
    ];

    // for (const user of userList) {
    // Check if the reaction is a thumbs up emoji
    if (event.reaction === "retro-achievements") {
      // Retrieve user information from retroachievements.org API
      // This gets the user's 10 most recently played games.
      console.log(event);

      const foundUser = getUserById(event.user);

      const userInformation = await getUserSummary(authorization, {
        userName: foundUser.username,
      });

      const channel = event.item.channel;
      const message = `User: ${userInformation.user}\nScore: ${userInformation.richPresenceMsg}`;
      const lastGameId = userInformation.lastGameId;

      const userRecentAchievements = await getGameInfoAndUserProgress(
        authorization,
        {
          userName: foundUser.username,
          gameId: lastGameId,
        }
      );

      const mostRecentAchievement = getMostRecentAchievement(
        userRecentAchievements
      );

      const game = await getGame(authorization, { gameId: lastGameId });
      //console.log(game)
      const messageBlock = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*User:* ${userInformation.user}\n` +
              `*SoftCore Points:* ${userInformation.totalSoftcorePoints}\n` +
              `*HardCore Points:* ${userInformation.totalPoints}\n` +
              `*Last Game:* ${game.title}\n` +
              `*Last Seen:* ${userInformation.richPresenceMsg}\n` +
              `*Last Achievement:* ${
                mostRecentAchievement
                  ? mostRecentAchievement.description
                  : "No recent achievement found"
              }`,
          },
          accessory: {
            type: "image",
            image_url: `https://retroachievements.org/${game.gameIcon}`,
            alt_text: "computer thumbnail",
          },
        },
      ];

      await client.chat.postMessage({
        channel: channel,
        blocks: messageBlock,
        text: "",
      });
    }
    // }
  } catch (error) {
    console.error("Error:", error);
  }
});

function getUserById(userid) {
  const user = userList.find((user) => user.userid === userid);
  return user || null; // Return the user object if found, or null if not found
}

function getMostRecentAchievement(data) {
  let mostRecentAchievement = null;
  let mostRecentAchievementDate = null;
  const currentDate = new Date();

  for (const achievementId in data.achievements) {
    const achievement = data.achievements[achievementId];

    if (achievement.dateEarned) {
      // Check if dateEarned exists
      const achievementDate = new Date(achievement.dateEarned);

      if (
        !mostRecentAchievement ||
        achievementDate > mostRecentAchievementDate
      ) {
        mostRecentAchievement = achievement;
        mostRecentAchievementDate = achievementDate;
      }
    }
  }

  return mostRecentAchievement;
}

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
