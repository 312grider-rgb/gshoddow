-- 018_seed_library.sql
-- A small starting set of genuinely real, legal, free resources --
-- Project Gutenberg (public domain classics) and OpenStax (free
-- official textbooks). This is just a starting point; teachers can
-- add their own original PDF uploads on top of this via the Library
-- page's "+ Add a Book" button.

insert into library_books (title, author, subject, grade_level, is_academic, external_url, description) values
('Pride and Prejudice', 'Jane Austen', 'English & Language Arts', null, false, 'https://www.gutenberg.org/ebooks/1342', 'A classic novel of manners, marriage, and wit in Regency England.'),
('Alice''s Adventures in Wonderland', 'Lewis Carroll', 'English & Language Arts', null, false, 'https://www.gutenberg.org/ebooks/11', 'A young girl falls down a rabbit hole into a nonsensical, imaginative world.'),
('Frankenstein', 'Mary Shelley', 'English & Language Arts', null, false, 'https://www.gutenberg.org/ebooks/84', 'The original science-fiction novel about a scientist and the creature he creates.'),
('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'English & Language Arts', null, false, 'https://www.gutenberg.org/ebooks/1661', 'Classic detective short stories featuring the famous London sleuth.'),
('Prealgebra 2e', 'OpenStax', 'Math', null, false, 'https://openstax.org/details/books/prealgebra-2e', 'A free, official textbook covering foundational algebra concepts.'),
('Biology 2e', 'OpenStax', 'Science', null, false, 'https://openstax.org/details/books/biology-2e', 'A comprehensive, free official biology textbook.'),
('U.S. History', 'OpenStax', 'History & Social Studies', null, false, 'https://openstax.org/details/books/us-history', 'A free, official overview of United States history.'),
('Algebra and Trigonometry 2e', 'OpenStax', null, 'high_school', true, 'https://openstax.org/details/books/algebra-and-trigonometry-2e', 'A free official textbook covering algebra and trigonometry for high school and early college.'),
('University Physics Volume 1', 'OpenStax', null, 'university', true, 'https://openstax.org/details/books/university-physics-volume-1', 'A free official university-level physics textbook covering mechanics and waves.'),
('The Tale of Peter Rabbit', 'Beatrix Potter', null, 'grade_1', true, 'https://www.gutenberg.org/ebooks/14838', 'A beloved illustrated children''s story, free and in the public domain.');
