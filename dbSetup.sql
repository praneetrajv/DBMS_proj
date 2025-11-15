DROP DATABASE IF EXISTS social_network;
CREATE DATABASE IF NOT EXISTS social_network;
USE social_network;

-- USER TABLE
CREATE TABLE IF NOT EXISTS User (
    UserID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    Name VARCHAR(255),
    Username VARCHAR(255) UNIQUE NOT NULL,
    Email VARCHAR(255) UNIQUE,
    Phone VARCHAR(50) UNIQUE,
    Gender VARCHAR(50),
    DOB DATE,
    PasswordHash VARCHAR(255) NOT NULL,
    ProfileType ENUM('Public', 'Private') DEFAULT 'Public'
);


-- LOGIN INFO TABLE
CREATE TABLE IF NOT EXISTS LoginInfo (
    LoginID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    UserID INT NOT NULL,
    LastLogin DATETIME,
    Status VARCHAR(50),
    FOREIGN KEY (UserID) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- GROUP TABLE
CREATE TABLE IF NOT EXISTS GroupTable (
    GroupID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Description TEXT,
    MemberCount INT DEFAULT 0,
    CreatedBy INT,
    CreatedDate DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (CreatedBy) REFERENCES User(UserID)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- POST TABLE
CREATE TABLE IF NOT EXISTS Post (
    PostID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    UserID INT NOT NULL,
    GroupID INT,
    Content TEXT,
    MediaType VARCHAR(50),
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    LikeCount INT DEFAULT 0,
    CommentCount INT DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (GroupID) REFERENCES GroupTable(GroupID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- LIKE TABLE
CREATE TABLE IF NOT EXISTS LikeTable (
    UserID INT NOT NULL,
    PostID INT NOT NULL,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserID, PostID), 
    FOREIGN KEY (UserID) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (PostID) REFERENCES Post(PostID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- COMMENT TABLE
CREATE TABLE IF NOT EXISTS Comment (
    CommentID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    UserID INT NOT NULL,
    PostID INT NOT NULL,
    Content TEXT NOT NULL,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (PostID) REFERENCES Post(PostID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- FRIENDSHIP TABLE
CREATE TABLE IF NOT EXISTS Friendship (
    UserID1 INT NOT NULL,
    UserID2 INT NOT NULL,
    Status VARCHAR(50) NOT NULL,
    SinceDate DATE,
    PRIMARY KEY (UserID1, UserID2), 
    FOREIGN KEY (UserID1) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (UserID2) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- GROUP MEMBERSHIP TABLE
CREATE TABLE IF NOT EXISTS GroupMembership (
    GroupID INT NOT NULL,
    UserID INT NOT NULL,
    Role VARCHAR(50) NOT NULL,
    JoinDate DATE DEFAULT (CURRENT_DATE),
    PRIMARY KEY (GroupID, UserID), 
    FOREIGN KEY (GroupID) REFERENCES GroupTable(GroupID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Function: Calculate User Age
DELIMITER $$
CREATE FUNCTION CalculateAge(dob DATE)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, dob, CURDATE());
END$$
DELIMITER ;

-- Procedure: Get User's News Feed
DELIMITER //
CREATE PROCEDURE GetNewsFeed(IN input_user_id INT)
BEGIN
    SELECT 
        P.PostID,
        P.UserID,
        U.Name AS Author,
        P.Content,
        P.Timestamp,
        P.LikeCount,
        P.CommentCount,
        G.Name AS GroupName
    FROM Post P
    JOIN User U ON P.UserID = U.UserID
    LEFT JOIN GroupTable G ON P.GroupID = G.GroupID
    WHERE 
        -- User's own posts
        P.UserID = input_user_id
        OR
        -- Posts from public profiles
        (U.ProfileType = 'Public' AND P.GroupID IS NULL)
        OR
        -- Posts from accepted friends (private profiles)
        (P.UserID IN (
            SELECT UserID2 FROM Friendship 
            WHERE UserID1 = input_user_id AND Status = 'Accepted'
            UNION
            SELECT UserID1 FROM Friendship 
            WHERE UserID2 = input_user_id AND Status = 'Accepted'
        ))
        OR
        -- Posts from groups the user is a member of
        P.GroupID IN (
            SELECT GroupID FROM GroupMembership WHERE UserID = input_user_id
        )
    ORDER BY P.Timestamp DESC;
END//
DELIMITER ;

-- Triggers for Like Count
DELIMITER //
CREATE TRIGGER increment_like_count 
AFTER INSERT ON LikeTable
FOR EACH ROW
BEGIN
    UPDATE Post 
    SET LikeCount = LikeCount + 1 
    WHERE PostID = NEW.PostID;
END//

CREATE TRIGGER decrement_like_count 
AFTER DELETE ON LikeTable
FOR EACH ROW
BEGIN
    UPDATE Post 
    SET LikeCount = LikeCount - 1 
    WHERE PostID = OLD.PostID;
END//

-- Triggers for Comment Count
CREATE TRIGGER increment_comment_count 
AFTER INSERT ON Comment
FOR EACH ROW
BEGIN
    UPDATE Post 
    SET CommentCount = CommentCount + 1 
    WHERE PostID = NEW.PostID;
END//

CREATE TRIGGER decrement_comment_count 
AFTER DELETE ON Comment
FOR EACH ROW
BEGIN
    UPDATE Post 
    SET CommentCount = CommentCount - 1 
    WHERE PostID = OLD.PostID;
END//

-- Triggers for Group Member Count
CREATE TRIGGER increment_member_count 
AFTER INSERT ON GroupMembership
FOR EACH ROW
BEGIN
    UPDATE GroupTable 
    SET MemberCount = MemberCount + 1 
    WHERE GroupID = NEW.GroupID;
END//

CREATE TRIGGER decrement_member_count 
AFTER DELETE ON GroupMembership
FOR EACH ROW
BEGIN
    UPDATE GroupTable 
    SET MemberCount = MemberCount - 1 
    WHERE GroupID = OLD.GroupID;
END//
DELIMITER ;

-- TABLE DESCRIPTIONS
DESCRIBE User;
DESCRIBE LoginInfo;
DESCRIBE GroupTable;
DESCRIBE Post;
DESCRIBE LikeTable;
DESCRIBE Comment;
DESCRIBE Friendship;
DESCRIBE GroupMembership;

-- Insert Users
INSERT INTO User (Name, Username, Email, Phone, Gender, DOB, PasswordHash) VALUES
('Alice Smith', 'alice_s', 'alice@example.com', '5551234', 'Female', '1990-05-15', 'hash_alice_123'),
('Bob Johnson', 'bob_j', 'bob@example.com', '5555678', 'Male', '1985-11-20', 'hash_bob_456'),
('Charlie Brown', 'charlie_b', 'charlie@example.com', '5559999', 'Male', '1998-01-01', 'hash_charlie_789'),
('David Lee', 'david_l', 'david.l@example.com', '5552221', 'Male', '1995-03-25', 'hash_david_001'),
('Eva Green', 'eva_g', 'eva.g@example.com', '5553332', 'Female', '1992-07-19', 'hash_eva_002'),
('Frank Harris', 'frank_h', 'frank.h@example.com', '5554443', 'Male', '2001-09-08', 'hash_frank_003'),
('Grace King', 'grace_k', 'grace.k@example.com', '5555554', 'Female', '1988-12-03', 'hash_grace_004'),
('Henry Moore', 'henry_m', 'henry.m@example.com', '5556665', 'Male', '1975-02-14', 'hash_henry_005'),
('Ivy Nelson', 'ivy_n', 'ivy.n@example.com', '5557776', 'Female', '1996-06-28', 'hash_ivy_006'),
('Jack Oliver', 'jack_o', 'jack.o@example.com', '5558887', 'Male', '1983-04-12', 'hash_jack_007');

-- Insert Login Information
INSERT INTO LoginInfo (UserID, LastLogin, Status) VALUES
(1, '2025-10-04 10:00:00', 'Active'),
(2, '2025-10-04 12:30:00', 'Active'),
(3, '2025-10-03 08:45:00', 'Inactive'),
(4, '2025-10-04 09:30:00', 'Active'),
(5, '2025-10-04 11:10:00', 'Active'),
(6, '2025-10-03 14:00:00', 'Inactive'),
(7, '2025-10-04 16:50:00', 'Active'),
(8, '2025-10-02 18:20:00', 'Inactive'),
(9, '2025-10-04 20:45:00', 'Active'),
(10, '2025-10-04 22:15:00', 'Active');

-- Insert Groups
INSERT INTO GroupTable (Name, Description) VALUES
('Local Hikers Club', 'A group for people who love hiking in the local mountains.'),
('Tech Enthusiasts', 'Discussing the latest gadgets and software.'),
('Cooking Enthusiasts', 'Sharing recipes and cooking tips.');

-- Insert Posts
INSERT INTO Post (UserID, GroupID, Content, MediaType, Timestamp) VALUES
(1, 1, 'Great trail day yesterday! Sun was perfect.', 'image', '2025-10-04 10:15:00'),
(2, NULL, 'Just finished reading a fantastic book.', 'text', '2025-10-04 12:45:00'),
(3, 2, 'Anyone see the new smartphone announcement?', 'text', '2025-10-04 15:30:00'),
(4, NULL, 'Thinking of learning a new programming language.', 'text', '2025-10-04 13:00:00'),
(5, 1, 'Does anyone know the difficulty level of the Bear Peak trail?', 'text', '2025-10-04 14:30:00'),
(6, 2, 'My new computer build is complete! Check out the specs.', 'image', '2025-10-04 16:00:00'),
(7, 3, 'Just baked a perfect sourdough loaf. Happy to share the starter!', 'image', '2025-10-04 17:30:00'),
(8, NULL, 'A reflective quote for the weekend.', 'text', '2025-10-04 19:00:00'),
(9, 3, 'Looking for an easy weeknight dinner recipe.', 'text', '2025-10-04 20:30:00'),
(10, 2, 'Is AI going to take over all coding jobs soon?', 'text', '2025-10-04 22:00:00'),
(1, NULL, 'Feeling productive today!', 'text', '2025-10-04 23:00:00');

-- Insert Friendships
INSERT INTO Friendship (UserID1, UserID2, Status, SinceDate) VALUES
(1, 2, 'Accepted', '2024-03-10'),
(1, 3, 'Pending', '2025-09-01'),
(2, 3, 'Accepted', '2025-01-01'),
(4, 5, 'Accepted', '2025-02-15'),
(7, 9, 'Accepted', '2025-09-20'),
(6, 8, 'Pending', '2025-10-04'),
(1, 4, 'Accepted', '2025-05-01');

-- Insert Group Memberships
INSERT INTO GroupMembership (GroupID, UserID, Role, JoinDate) VALUES
(1, 1, 'Admin', '2024-01-01'),
(1, 2, 'Member', '2024-05-20'),
(2, 3, 'Member', '2025-06-15'),
(2, 1, 'Member', '2025-07-25'),
(2, 4, 'Member', '2025-08-01'),
(1, 5, 'Member', '2025-08-10'),
(2, 6, 'Member', '2025-08-15'),
(3, 7, 'Admin', '2025-09-01'),
(3, 8, 'Member', '2025-09-05'),
(3, 9, 'Member', '2025-09-10'),
(2, 10, 'Admin', '2025-09-15');

-- Insert Likes
INSERT INTO LikeTable (UserID, PostID) VALUES
(2, 1), (1, 2), (2, 3), (4, 2), (5, 1),
(7, 7), (8, 8), (10, 6), (1, 7), (2, 10), (3, 4);

-- Insert Comments
INSERT INTO Comment (UserID, PostID, Content) VALUES
(3, 5, 'It''s tough! Bring lots of water.'),
(1, 7, 'That looks amazing! Please share the recipe.'),
(4, 10, 'Not completely, but the role will definitely change.'),
(7, 9, 'Try this simple pasta recipe I just posted!'),
(5, 1, 'I was on the Green Valley trail last week. Absolutely stunning!'),
(10, 4, 'Try Rust! It has a steep learning curve but is worth it.'),
(8, 7, 'Wow, that crust looks incredible. What temperature did you bake it at?'),
(7, 9, 'I love a good stir-fry when I''m short on time!'),
(4, 6, 'Awesome specs! Are you running Linux or Windows on that setup?'),
(6, 10, 'I think it''ll automate the boring stuff, letting developers focus on complex design.'),
(9, 2, 'If you liked that, you should check out the author''s previous work, "The Silent City."'),
(1, 8, 'Very true! A great way to start the weekend.');
