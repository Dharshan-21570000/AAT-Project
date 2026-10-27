# 📚 World Digital Library

**Discover your next great read.**

World Digital Library is a responsive, browser-based book discovery website that helps users explore books from different subjects, search for titles and authors, and organize their personal reading collections.

Built with **HTML, CSS, and JavaScript**, the project uses the Open Library API to retrieve real book catalogue information and cover images.

---

## ✨ Features

### 🔍 1. Smart Book Search

* Search books by title, author, ISBN, subject, or general keywords.
* Choose a specific search field to refine your query.
* Explore book details, including available author, publisher, publication year, and subject information.
* Browse additional results using the Load More option.
* View popular search suggestions.

### 📖 2. Book Discovery

* Discover featured books and recent finds.
* Explore books by subject and category.
* Browse a wide range of topics, from computer science to literature.

### 🗂️ 3. Book Categories

Explore books across **25 categories**, including:

* Computer Science
* Artificial Intelligence
* Machine Learning
* Programming
* Science
* Mathematics
* Engineering
* Medicine
* History
* Geography
* Fiction
* Mystery
* Romance
* Fantasy
* Philosophy
* Psychology
* Business
* Economics
* Education
* Children's Books
* Literature
* Tamil Books
* English Books
* Hindi Books
* Competitive Exam Preparation

### ❤️ 4. Personal Library

* Add books to your favourites.
* Maintain a separate reading list.
* Remove books from either collection.
* View saved books in dedicated tabs.
* Track the number of saved books.

Your saved collections are stored locally in your browser using `localStorage`.

### 🎨 5. Modern User Interface

* Clean, book-inspired design.
* Responsive layouts for different screen sizes.
* Light and dark themes.
* Mobile-friendly navigation.
* Smooth scrolling and interactive elements.
* Loading skeletons and notifications.
* Book-cover placeholders when images are unavailable.

### 🎛️ 6. Search Filters and Sorting

Refine search results using:

* Author
* Publication year
* Language
* Subject

Sort results by:

* Relevance
* Title
* Publication year

### 🕘 7. Search History

* Automatically record recent searches.
* Revisit previous searches.
* Keep up to 10 recent search entries.
* Clear search history when needed.

### 📚 8. Book Details

Open a book to explore its available catalogue information and access links.

Book availability and reading access depend on the rights and services provided for each title.

### ♿ 9. Accessibility

* Semantic HTML structure.
* Accessible labels for interactive elements.
* Keyboard-visible focus indicators.
* Screen-reader announcements for dynamic content.
* Skip-to-content navigation.
* Descriptive alternative text for book covers.

### 📩 10. Contact Section

The website includes a contact form interface for preparing a message.

**Note:** The current contact form is a demonstration and does not send or store messages.

---

## 🛠️ Technologies Used

| Technology              | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| HTML5                   | Website structure and content                                           |
| CSS3                    | Styling, responsive layouts, themes, and animations                     |
| JavaScript (ES6+)       | Search logic, dynamic content, filtering, and interactions              |
| Open Library API        | Book catalogue search and metadata                                      |
| Open Library Covers API | Book cover images                                                       |
| Local Storage           | Saving favourites, reading lists, theme preferences, and search history |
| Google Fonts            | DM Sans and Playfair Display typography                                 |

### APIs

**Open Library Search API**

Used to retrieve book catalogue information.

`https://openlibrary.org/search.json`

**Open Library Covers API**

Used to display book cover images.

`https://covers.openlibrary.org`

---

## 📂 Project Structure

```text
World-Digital-Library/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

### File Descriptions

| File         | Description                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `index.html` | Contains the website structure, navigation, search form, book sections, categories, personal library, and contact form.      |
| `style.css`  | Defines the visual design, colours, typography, responsive layouts, dark theme, animations, and interactive states.          |
| `script.js`  | Implements API requests, book search, filtering, sorting, search history, favourites, reading lists, and other interactions. |
| `README.md`  | Documents the project, its features, technologies, and setup instructions.                                                   |

---

## 🚀 Getting Started

Follow these steps to run the project on your computer.

### Prerequisites

You need:

* A modern web browser such as Chrome, Edge, Firefox, or Safari.
* A code editor such as Visual Studio Code.
* An active internet connection to retrieve book data, cover images, and web fonts.

No backend server or API key is required by the current frontend implementation.

### 1. Clone the Repository

Open your terminal and run:

```bash
git clone YOUR_REPOSITORY_URL
```

Replace `YOUR_REPOSITORY_URL` with your GitHub repository's clone URL.

### 2. Navigate to the Project Folder

```bash
cd World-Digital-Library
```

Use your actual repository folder name if it is different.

### 3. Run the Website

**Option A: Open directly**

Open `index.html` in your web browser.

**Option B: Use Visual Studio Code**

1. Open the project folder in Visual Studio Code.
2. Install the Live Server extension if needed.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

The website should open in your default browser.

### 4. Start Exploring

* Search for a book.
* Browse the available categories.
* Open book details.
* Add titles to your favourites.
* Build your reading list.
* Switch between light and dark themes.

An internet connection is required for live catalogue searches and remote book-cover images.

---

## ⚙️ How It Works

### 1. Searching for Books

The JavaScript code sends requests to the Open Library Search API.

Users can search across different fields, and the application retrieves catalogue records containing available metadata.

### 2. Displaying Results

The application processes the returned records and dynamically creates book cards containing information such as:

* Title
* Author
* Publication year
* Publisher
* Cover image, when available

### 3. Filtering and Sorting

Users can refine the currently retrieved search results by author, publication year, language, or subject.

The available sorting options are relevance, title, and publication year.

### 4. Managing Personal Collections

The application uses browser `localStorage` to save:

* Favourite books
* Reading-list books
* Recent searches
* Theme preference

These preferences and collections remain available in the same browser unless the stored data is cleared or otherwise removed.

### 5. Improving Performance

The application includes:

* A cache for recent API responses.
* Request cancellation when a new search replaces an earlier one.
* Loading placeholders while results are being retrieved.
* Lazy loading for book-cover images.

---

## 🌐 Data Source and Attribution

Book catalogue information and cover images are provided by Open Library.

* **Open Library:** https://openlibrary.org/
* **Open Library Search API:** https://openlibrary.org/developers/api
* **Internet Archive:** https://archive.org/

The website does not host its own complete book catalogue. Book information, image availability, and reading access depend on the external services.

The availability of a book does not necessarily mean it can be read for free.

---

## 🔐 Privacy and Data Storage

This project is a frontend web application.

* Favourites and reading lists are stored in the browser's local storage.
* Search history is stored locally in the browser.
* Theme preferences are stored locally.
* Book searches communicate with the Open Library API.
* The contact form does not send or store submitted messages in its current implementation.

Local storage is specific to the browser and website origin. Clearing browser storage may remove saved collections and preferences.

---

## 🔮 Future Enhancements

Possible improvements include:

* User registration and authentication.
* Cloud synchronization of reading lists.
* Advanced search filters.
* Pagination controls and improved search navigation.
* Book reviews and personal ratings.
* Reading progress tracking.
* Book recommendations based on interests.
* Reading statistics and dashboards.
* A backend service for managing user accounts.
* A functional contact form with a secure message-delivery service.
* Progressive Web App (PWA) support.
* Additional language and accessibility improvements.

These are potential future enhancements and are not all implemented in the current version.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.

2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Make your changes.

4. Test the website in your browser.

5. Commit your changes:

   ```bash
   git commit -m "Add your feature"
   ```

6. Push your branch:

   ```bash
   git push origin feature/your-feature
   ```

7. Open a pull request.

---

## 📄 License

No license has been specified for this project yet.

Before distributing or reusing the code, add a `LICENSE` file specifying the terms under which others may use it.

---

## 👨‍💻 Author

**Project:** World Digital Library

**Description:** A responsive book discovery and personal reading-list website powered by the Open Library API.

---

### 📚 Discover. Explore. Read.

*Every book opens a new world.*
