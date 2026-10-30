(function () {
    const isEnglish = window.location.pathname.split('/').includes('en');

    const labels = isEnglish
        ? { signIn: 'Sign In', myAccount: 'My Account', signOut: 'Sign Out' }
        : { signIn: 'Entrar', myAccount: 'Minha Conta', signOut: 'Sair' };

    const headerAction = document.querySelector('.header-action');
    const mobileList = document.querySelector('.mobile-nav-list');

    const logout = async (event) => {
        event.preventDefault();
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch {
            // ignore network errors on logout
        }
        window.location.href = 'index.html';
    };

    const renderHeader = (user) => {
        if (headerAction) {
            headerAction.querySelectorAll('.auth-link').forEach((element) => element.remove());

            if (user) {
                const accountLink = document.createElement('a');
                accountLink.className = 'text-link auth-link';
                accountLink.style.marginRight = '14px';
                accountLink.href = 'minha-conta.html';
                accountLink.textContent = labels.myAccount;
                headerAction.insertBefore(accountLink, headerAction.firstChild);

                const signOutLink = document.createElement('a');
                signOutLink.className = 'text-link auth-link';
                signOutLink.style.marginRight = '18px';
                signOutLink.href = '#';
                signOutLink.textContent = labels.signOut;
                signOutLink.addEventListener('click', logout);
                headerAction.insertBefore(signOutLink, accountLink.nextSibling);
            } else {
                const authLink = document.createElement('a');
                authLink.className = 'text-link auth-link';
                authLink.style.marginRight = '18px';
                authLink.href = 'login.html';
                authLink.textContent = labels.signIn;
                headerAction.insertBefore(authLink, headerAction.firstChild);
            }
        }

        if (mobileList && !mobileList.querySelector('.auth-link-mobile')) {
            if (user) {
                const accountLi = document.createElement('li');
                const accountLink = document.createElement('a');
                accountLink.className = 'auth-link-mobile';
                accountLink.href = 'minha-conta.html';
                accountLink.textContent = labels.myAccount;
                accountLi.appendChild(accountLink);
                mobileList.insertBefore(accountLi, mobileList.firstChild);

                const signOutLi = document.createElement('li');
                const signOutLink = document.createElement('a');
                signOutLink.className = 'auth-link-mobile';
                signOutLink.href = '#';
                signOutLink.textContent = labels.signOut;
                signOutLink.addEventListener('click', logout);
                signOutLi.appendChild(signOutLink);
                mobileList.insertBefore(signOutLi, accountLi.nextSibling);
            } else {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.className = 'auth-link-mobile';
                link.href = 'login.html';
                link.textContent = labels.signIn;
                li.appendChild(link);
                mobileList.insertBefore(li, mobileList.firstChild);
            }
        }
    };

    fetch('/api/me')
        .then((response) => response.json())
        .then((data) => renderHeader(data.user))
        .catch(() => renderHeader(null));

    window.TOR_AUTH = { getUser: () => fetch('/api/me').then((response) => response.json()).then((data) => data.user) };
})();
