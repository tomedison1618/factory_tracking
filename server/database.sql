-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS factory_tracker;

-- Use the database
USE factory_tracker;

-- Create the tables
CREATE TABLE `product_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `typeName` varchar(255) NOT NULL,
  `partNumber` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_stages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stageName` varchar(255) NOT NULL,
  `sequenceOrder` int NOT NULL,
  `productTypeId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `productTypeId` (`productTypeId`),
  CONSTRAINT `production_stages_ibfk_1` FOREIGN KEY (`productTypeId`) REFERENCES `product_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Manager','Technician') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docketNumber` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `productTypeId` int DEFAULT NULL,
  `status` enum('Open','Completed','Closed') NOT NULL,
  `priority` int NOT NULL,
  `dueDate` date NOT NULL,
  `currentStageId` int DEFAULT NULL,
  `assignedUserId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `productTypeId` (`productTypeId`),
  KEY `currentStageId` (`currentStageId`),
  KEY `assignedUserId` (`assignedUserId`),
  CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`productTypeId`) REFERENCES `product_types` (`id`),
  CONSTRAINT `jobs_ibfk_2` FOREIGN KEY (`currentStageId`) REFERENCES `production_stages` (`id`),
  CONSTRAINT `jobs_ibfk_3` FOREIGN KEY (`assignedUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jobId` int DEFAULT NULL,
  `productionStageId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jobId` (`jobId`),
  KEY `productionStageId` (`productionStageId`),
  KEY `userId` (`userId`),
  CONSTRAINT `job_assignments_ibfk_1` FOREIGN KEY (`jobId`) REFERENCES `jobs` (`id`),
  CONSTRAINT `job_assignments_ibfk_2` FOREIGN KEY (`productionStageId`) REFERENCES `production_stages` (`id`),
  CONSTRAINT `job_assignments_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jobId` int DEFAULT NULL,
  `serialNumber` varchar(255) NOT NULL,
  `status` enum('Pending','In Progress','Completed','Failed','Scrapped') NOT NULL,
  `currentWorkerId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jobId` (`jobId`),
  KEY `currentWorkerId` (`currentWorkerId`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`jobId`) REFERENCES `jobs` (`id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`currentWorkerId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_stage_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int DEFAULT NULL,
  `productionStageId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `productId` (`productId`),
  KEY `productionStageId` (`productionStageId`),
  CONSTRAINT `product_stage_links_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products` (`id`),
  CONSTRAINT `product_stage_links_ibfk_2` FOREIGN KEY (`productionStageId`) REFERENCES `production_stages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stage_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productStageLinkId` int DEFAULT NULL,
  `status` enum('PENDING','STARTED','PASSED','FAILED','RESET','SCRAPPED') NOT NULL,
  `notes` text,
  `timestamp` datetime NOT NULL,
  `userId` int DEFAULT NULL,
  `durationSeconds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `productStageLinkId` (`productStageLinkId`),
  KEY `userId` (`userId`),
  CONSTRAINT `stage_events_ibfk_1` FOREIGN KEY (`productStageLinkId`) REFERENCES `product_stage_links` (`id`),
  CONSTRAINT `stage_events_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_stage_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jobId` int DEFAULT NULL,
  `productionStageId` int DEFAULT NULL,
  `status` enum('Pending','In Progress','Completed') NOT NULL,
  `passedCount` int NOT NULL,
  `failedCount` int NOT NULL,
  `scrappedCount` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobId` (`jobId`),
  KEY `productionStageId` (`productionStageId`),
  CONSTRAINT `job_stage_statuses_ibfk_1` FOREIGN KEY (`jobId`) REFERENCES `jobs` (`id`),
  CONSTRAINT `job_stage_statuses_ibfk_2` FOREIGN KEY (`productionStageId`) REFERENCES `production_stages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO `product_types` (`typeName`, `partNumber`) VALUES
('Type A', 'PN-001'),
('Type B', 'PN-002');

INSERT INTO `production_stages` (`stageName`, `sequenceOrder`, `productTypeId`) VALUES
('Assembly', 1, 1),
('Testing', 2, 1),
('Packaging', 3, 1),
('Assembly', 1, 2),
('Welding', 2, 2),
('Painting', 3, 2);

INSERT INTO `users` (`username`, `password`, `role`) VALUES
('admin', 'admin', 'Admin'),
('manager', 'manager', 'Manager'),
('technician1', 'tech1', 'Technician'),
('technician2', 'tech2', 'Technician');

INSERT INTO `jobs` (`docketNumber`, `quantity`, `productTypeId`, `status`, `priority`, `dueDate`, `currentStageId`, `assignedUserId`) VALUES
('DKT-001', 10, 1, 'Open', 1, '2025-09-10', 1, 3),
('DKT-002', 5, 2, 'Open', 2, '2025-09-12', 4, 4);

INSERT INTO `job_assignments` (`jobId`, `productionStageId`, `userId`) VALUES
(1, 1, 3),
(1, 2, 3),
(1, 3, 3),
(2, 4, 4),
(2, 5, 4),
(2, 6, 4);

INSERT INTO `products` (`jobId`, `serialNumber`, `status`, `currentWorkerId`) VALUES
(1, 'SN-001', 'Pending', NULL),
(1, 'SN-002', 'Pending', NULL),
(2, 'SN-003', 'Pending', NULL);

INSERT INTO `product_stage_links` (`productId`, `productionStageId`) VALUES
(1, 1),
(1, 2),
(1, 3),
(2, 1),
(2, 2),
(2, 3),
(3, 4),
(3, 5),
(3, 6);

INSERT INTO `stage_events` (`productStageLinkId`, `status`, `notes`, `timestamp`, `userId`, `durationSeconds`) VALUES
(1, 'PENDING', NULL, NOW(), 1, NULL),
(4, 'PENDING', NULL, NOW(), 1, NULL),
(7, 'PENDING', NULL, NOW(), 1, NULL);

INSERT INTO `job_stage_statuses` (`jobId`, `productionStageId`, `status`, `passedCount`, `failedCount`, `scrappedCount`) VALUES
(1, 1, 'In Progress', 0, 0, 0),
(1, 2, 'Pending', 0, 0, 0),
(1, 3, 'Pending', 0, 0, 0),
(2, 4, 'In Progress', 0, 0, 0),
(2, 5, 'Pending', 0, 0, 0),
(2, 6, 'Pending', 0, 0, 0);
