CREATE TABLE `admin` (
  `user_id` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `fname` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_dt` timestamp DEFAULT current_timestamp(),
  `updated_dt` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `users` (
  `user_id` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `chainId` varchar(255) NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_dt` timestamp DEFAULT current_timestamp(),
  `updated_dt` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `trades` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `chain_id` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `salt` varchar(255) NOT NULL,
  `maker_asset` varchar(255) NOT NULL,
  `taker_asset` varchar(255) NOT NULL,
  `maker_asset_data` varchar(255) NOT NULL,
  `taker_asset_data` varchar(255) NOT NULL,
  `get_maker_amount` varchar(255) NOT NULL,
  `get_taker_amount` varchar(255) NOT NULL,
  `predicate` varchar(255) NOT NULL,
  `permit` varchar(255) NOT NULL,
  `interaction` varchar(255) NOT NULL,
  `signature` varchar(255) NOT NULL,
  `order_hash` varchar(255) NOT NULL,
  `maker_amount` varchar(255) NOT NULL,
  `taker_amount` varchar(255) NOT NULL,
  `threshold_amount` varchar(255) NOT NULL,
  `maker_token` varchar(255) NOT NULL,
  `taker_token` varchar(255) NOT NULL,
  `limit_order_contract` varchar(255) NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_dt` timestamp DEFAULT current_timestamp(),
  `updated_dt` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `trades` ADD `expiry` timestamp NULL AFTER `limit_order_contract`;