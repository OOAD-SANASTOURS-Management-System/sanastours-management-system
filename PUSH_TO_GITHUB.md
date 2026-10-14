# Pushing this repository to GitHub

This folder is already a git repository with one commit on the `main` branch.
You only need to create an empty repository on GitHub and push to it.

## 1. Create the GitHub repository

Go to https://github.com/new and create a repository named:

    member2-package-destination-quotation

Leave **"Add a README file"**, **.gitignore** and **licence** all unticked — this
folder already has them, and a pre-filled repository causes a push conflict.

## 2. Push from this folder

Open a terminal in this folder and run:

    git remote add origin https://github.com/<your-username>/member2-package-destination-quotation.git
    git branch -M main
    git push -u origin main

Replace `<your-username>` with your own GitHub username.

## 3. Later changes

    git add .
    git commit -m "describe what you changed"
    git push

## If git says the remote already exists

    git remote set-url origin https://github.com/<your-username>/member2-package-destination-quotation.git
    git push -u origin main
