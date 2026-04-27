// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Twitter {
    // Every tweet stores only the IPFS CID on-chain to keep gas usage low.
    struct Tweet {
        uint256 id;
        address author;
        string ipfsHash;
        uint256 timestamp;
        uint256 likes;
    }

    error EmptyIpfsHash();
    error InvalidTweetId();
    error AlreadyLiked();

    uint256 public tweetCount;

    mapping(uint256 => Tweet) public tweets;
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    event TweetCreated(
        uint256 indexed id,
        address indexed author,
        string ipfsHash,
        uint256 timestamp
    );
    event TweetLiked(
        uint256 indexed id,
        address indexed liker,
        uint256 likes
    );

    function createTweet(string calldata _ipfsHash) external {
        if (bytes(_ipfsHash).length == 0) revert EmptyIpfsHash();

        unchecked {
            ++tweetCount;
        }

        uint256 newTweetId = tweetCount;
        Tweet storage newTweet = tweets[newTweetId];
        newTweet.id = newTweetId;
        newTweet.author = msg.sender;
        newTweet.ipfsHash = _ipfsHash;
        newTweet.timestamp = block.timestamp;

        emit TweetCreated(newTweetId, msg.sender, _ipfsHash, block.timestamp);
    }

    function likeTweet(uint256 _tweetId) external {
        if (_tweetId == 0 || _tweetId > tweetCount) revert InvalidTweetId();
        if (hasLiked[_tweetId][msg.sender]) revert AlreadyLiked();

        hasLiked[_tweetId][msg.sender] = true;

        unchecked {
            ++tweets[_tweetId].likes;
        }

        emit TweetLiked(_tweetId, msg.sender, tweets[_tweetId].likes);
    }

    function getAllTweets() external view returns (Tweet[] memory) {
        Tweet[] memory allTweets = new Tweet[](tweetCount);

        // Tweet IDs start at 1, so we shift the zero-based array index by one.
        for (uint256 i = 0; i < tweetCount; ) {
            allTweets[i] = tweets[i + 1];

            unchecked {
                ++i;
            }
        }

        return allTweets;
    }
}
