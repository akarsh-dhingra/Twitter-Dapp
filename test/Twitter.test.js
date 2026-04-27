const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { ethers } = require("hardhat");

describe("Twitter", function () {
  async function deployTwitterFixture() {
    const [owner, user] = await ethers.getSigners();
    const Twitter = await ethers.getContractFactory("Twitter");
    const twitter = await Twitter.deploy();
    await twitter.waitForDeployment();

    return { twitter, owner, user };
  }

  it("creates a tweet and stores all tweet metadata", async function () {
    const { twitter, owner } = await deployTwitterFixture();
    const ipfsHash = "QmTweetCID";

    await expect(twitter.createTweet(ipfsHash))
      .to.emit(twitter, "TweetCreated")
      .withArgs(1n, owner.address, ipfsHash, anyValue);

    const storedTweet = await twitter.tweets(1);

    expect(await twitter.tweetCount()).to.equal(1n);
    expect(storedTweet.id).to.equal(1n);
    expect(storedTweet.author).to.equal(owner.address);
    expect(storedTweet.ipfsHash).to.equal(ipfsHash);
    expect(storedTweet.likes).to.equal(0n);
    expect(storedTweet.timestamp).to.be.greaterThan(0n);
  });

  it("likes a tweet and prevents the same wallet from liking twice", async function () {
    const { twitter, owner, user } = await deployTwitterFixture();
    await twitter.connect(owner).createTweet("QmAnotherTweetCID");

    await expect(twitter.connect(user).likeTweet(1))
      .to.emit(twitter, "TweetLiked")
      .withArgs(1n, user.address, 1n);

    expect(await twitter.hasLiked(1, user.address)).to.equal(true);
    expect((await twitter.tweets(1)).likes).to.equal(1n);

    await expect(twitter.connect(user).likeTweet(1))
      .to.be.revertedWithCustomError(twitter, "AlreadyLiked");
  });

  it("returns every stored tweet from getAllTweets", async function () {
    const { twitter, owner, user } = await deployTwitterFixture();

    await twitter.connect(owner).createTweet("QmCidOne");
    await twitter.connect(user).createTweet("QmCidTwo");

    const allTweets = await twitter.getAllTweets();

    expect(allTweets).to.have.lengthOf(2);
    expect(allTweets[0].id).to.equal(1n);
    expect(allTweets[0].author).to.equal(owner.address);
    expect(allTweets[1].id).to.equal(2n);
    expect(allTweets[1].author).to.equal(user.address);
  });

  it("reverts when the IPFS hash is empty or the tweet id is invalid", async function () {
    const { twitter, owner } = await deployTwitterFixture();

    await expect(twitter.createTweet(""))
      .to.be.revertedWithCustomError(twitter, "EmptyIpfsHash");

    await twitter.connect(owner).createTweet("QmValidTweetCID");

    await expect(twitter.likeTweet(2))
      .to.be.revertedWithCustomError(twitter, "InvalidTweetId");
  });
});
