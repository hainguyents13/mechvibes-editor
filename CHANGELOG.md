# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Say what kind of pack it is.** **Edit Pack Information** asks for the pack's **Category** (Realistic, Game, Fun or App sounds), **How it sounds** in up to 3 words, and, for a realistic pack, its **Switch type**. They are the same lists as on mechvibes.com, and the downloaded pack carries them, so the website's new pack form starts with them filled in. Suggested tags sit under the tag field, one click each.
- **Say where the sounds come from.** **Edit Pack Information** has a **Source link** for the video or page the sounds were cut from, such as a YouTube typing video. The downloaded pack carries it, so the website's new pack form starts with it filled in.

### Changed

- **Tags no longer repeat the other fields.** A tag that only says the category, a sound word or the switch type is left out of the pack. When you open an older pack, such tags fill in those fields instead.

## [1.2.0] - 2026-11-05

### Added

- **Know where to start.** A new pack's keyboard waits for sounds, and now says so: add your sounds below, then pick keys and give each one a sound, with an arrow to the ways to add them.

### Changed

- **A new look, the same as mechvibes.com.** The editor takes the site's colours, fonts, buttons and header, in light and dark. The light/dark switch moves to the top bar, and the footer shows only before a pack is open, so the keyboard gets the room.
- **Keys you can read at a glance.** Keys are drawn as raised keycaps. The edge under a key shows its sounds: the left half for the press sound, the right half for the release sound. This replaces the dots, on the keyboard, the mouse and the key card.
- **What is done, and what comes next, in one place.** A band under the top bar shows the steps so far and the **Next** line. **Quick select** (letters, numbers, F keys, modifiers) sits right above the keyboard, and **Press** and **Release** sit beside **Apply**.

## [1.1.0] - 2026-11-02

### Added

- **Your work is saved as you go.** The editor keeps the pack you are working on in this browser a moment after each change. If the tab crashes, reloads or closes, the start screen offers **Continue where you left off** with its files, keys and details. One pack is kept at a time, and nothing leaves your computer. If it was not downloaded, the editor asks before another pack takes its place.
- **Keep your keys when a file's audio is lost.** A pack whose zip lacks one of its audio files still opens with every key and its times; that file shows as **Audio missing**. **Remove audio, keep keys** in a file's **...** menu does the same on purpose, for a file in a format that gives trouble. **Replace file** then gives the keys new audio in any format, and **Download .zip** says which files still need it.
- **Know before you share.** After **Download .zip**, a keyboard pack the library would refuse says what to fix: the library needs at least 60 keys with a sound, and at most 5 silent letter keys.

### Changed

- **Smaller packs from long recordings.** When the keys play less than half of a recording, only the parts they play go into the pack, as OGG. A long take used for a few clicks no longer makes a big download.
- **Your account name as the author.** Leave **Author** empty while you are signed in on mechvibes.com, and the downloaded pack credits your account's name.
- **Update says when nothing changed.** If the pack is the same as the one in the library, **Update** says so instead of publishing a new revision.

## [1.0.0] - 2026-11-02

The first release of the Mechvibes Editor at [editor.mechvibes.com](https://editor.mechvibes.com).

### Added

- **Make sound packs for Mechvibes right in your browser.** There is nothing to install and no account to make. Your sounds stay on your computer: the editor sends a pack to mechvibes.com only when you press **Update** on one of your library packs.
- **Keyboard packs and mouse packs.** A new pack asks one question, Keyboard or Mouse. A mouse pack has the mouse buttons and the wheel. The **Keyboard pack** chip next to the pack name switches it later, and asks whether to keep the sounds the new type does not play. Wheel sounds play on Linux only for now.
- **Everything a pack can hold.** Each key or button gets a press sound and, if you like, a release sound. A pack can mix sounds cut from one recording with sounds from many files. Click the pack name in the navbar to edit its name, author, description, tags, icon, recommended volume and random pitch.
- **A start screen with three ways in:** **Edit my pack**, **Open a pack file** and **Make a new pack**. Each card is one click, and the browser's Back and Forward buttons move between the screens.
- **Drop anything on the page.** A .zip or a pack folder opens the pack. Audio or video starts a new pack, or joins the one that is open. While you drag, the page says what the drop will do, and a file it cannot use, such as a .rar, a .7z or a link, gets one line saying why.
- **Open the packs you already have.** Open a pack's .zip, even one zipped inside its folder. Downloading it again keeps what the editor does not change, such as the license file and extra settings. Keys that cannot be kept are listed when the pack opens. Classic (V1) packs cannot be opened.
- **Edit your library packs and publish them in one click.** Sign in on mechvibes.com and the editor uses that session. **Edit my pack** lists your packs, **Open to edit** opens one, and **Update** publishes its next revision. The **Edit sounds** button on the website opens a pack straight in the editor. If the pack changed on the website after you opened it, Update stops and suggests downloading a copy first.
- **Start from the sounds you have.** An empty pack offers three choices: **One recording of typing**, **One file for each key** and **A video of typing**. Each opens a file picker that fits it. No recording yet? Short tips show how to record your keyboard with your phone.
- **Most audio and video files work.** MP3, WAV, OGG, FLAC, M4A, MP4, WEBM and MOV. Files other than OGG and MP3 are turned into OGG for the pack. From a video, only the sound goes in, and only the parts its keys use.
- **Each file knows what it holds.** A file is either one key sound or a recording of many presses. The choice you picked decides, and otherwise a file up to 1 second long counts as one sound. **Change** on the summary line, or the file's **...** menu, switches it.
- **Keys found by file name.** Add files such as a.wav, space.wav or alt.wav, and **Give them to their keys** puts each one on its key in one step. Numbered files like click1 to click5 can be spread across keys, and other files given to keys in order. **Choose folder** adds every sound in a folder at once.
- **Cut sounds out of a recording.** Select a part on the waveform, or let **Auto detect** find the presses and click one, then **Apply** it to the selected keys. Each file has its own color, also shown as a dot on its keys. Space plays the part, and exact times in milliseconds are under **More**.
- **Select keys like files in a file manager.** Click, Shift+click for a range, Ctrl or ⌘+click to add or remove, drag a box, or press Ctrl or ⌘+A. **Quick select** picks groups such as letter keys, numbers or F keys. The keyboard comes in Full size, TKL and Compact, and keys with a sound that a smaller layout hides are listed in a tray.
- **Drag a file onto a key.** Drag a file of one sound onto a key, a mouse button or a selection of keys. Drop a short audio file (2 seconds or less) from your computer onto a key, and it goes straight to that key.
- **A card for the key you pick.** Select one key that has a sound to see its file, play its press and release, and see how many other keys share it. From there you can **Change file**, **Remove sound**, **Add a release sound** or **Swap press and release**. When a key plays a whole file that holds both a press and a release, **Split it** opens that file on the waveform.
- **Replace a file without redoing its keys.** **Replace file** in a file's **...** menu swaps its audio for every key that uses it and keeps their times. It asks first when a key would play past the end of the new file.
- **Hear your pack before you save it.** **Try it** lets you type on your own keyboard, or click and scroll your mouse, and hear the pack the way Mechvibes will play it, press and release. On a touch screen, tap the keys.
- **Save a pack the Mechvibes app opens.** **Download .zip** gives you a pack the Mechvibes app imports, ready to share on the sound pack library at mechvibes.com.
- **Only what you need, when you need it.** The workspace grows with the pack: first the ways to add sounds, then your files and the waveform, then **Try it** and **Download .zip** once a key has a sound. A **Next** line above the keyboard says what to do.
- **A progress line under the keyboard.** Sounds added, how many keys have a sound, Try it and Download .zip each get a check as you go, in any order. Keys without a sound stay silent, and that is fine.
- **Undo and redo every change.** Each change is a named step: Ctrl or ⌘+Z undoes it, and Ctrl+Y or Ctrl or ⌘+Shift+Z redoes it, or use the buttons in the navbar. The editor asks before replacing work you have not downloaded, and warns before you close the tab.
- **Start over keeps your work.** **Start over** goes back to the start screen, and **Back to** your pack returns to it with its files, undo history and selection as they were. Your work is only replaced when you pick another way in, and the editor asks first if it has changes.
- **A guided tour.** It opens the first time you pick a way in, with the steps for that way. **Help** replays it and lists the keyboard shortcuts for selecting keys.
- **Room to work on any laptop.** The keyboard scales to fit short screens. On a wide screen, drag the bar above the sound panel to give the keyboard or the waveform more room, and double-click it to reset. A button in the footer switches between light and dark, and the editor remembers your choice.
- **A clear note on phones.** Making a pack needs a screen at least 768 pixels wide, so a phone shows a short note with **Copy link**, to open the editor later on a computer.
- **See which version you are using.** The version sits next to the editor's name, and clicking it shows what is new in each release.
