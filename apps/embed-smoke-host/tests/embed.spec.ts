import { expect, test } from '@playwright/test';

test( 'embed host boots the editor through public SDK packages', async ( { page } ) => {
	await page.goto( '/' );
	await expect( page.getByText( 'Embed Smoke Host' ).first() ).toBeVisible();
	await expect( page.getByRole( 'heading', { name: 'Embedded Builder Host' } ) ).toBeVisible();
	await expect( page.getByTestId( 'runtime-link' ) ).toHaveAttribute( 'href', '/published/embed-home' );
	await page.getByRole( 'button', { name: /save/i } ).first().click();
	await expect( page.getByTestId( 'hook-log' ) ).toContainText( /save:|project:/ );
} );

test( 'host permissions can disable AI and publishing affordances', async ( { page } ) => {
	await page.goto( '/?deny=ai&deny=publish' );
	await expect( page.getByRole( 'button', { name: 'AI disabled' } ) ).toBeVisible();
	await page.getByRole( 'navigation', { name: 'Panel pages' } ).getByRole( 'button', { name: 'History' } ).click();
	await expect( page.getByRole( 'button', { name: 'Publish' } ).first() ).toBeDisabled();
	await expect( page.getByLabel( 'Builder panel', { exact: true } ).getByRole( 'button', { name: 'Publish' } ) ).toBeDisabled();
} );

test( 'published runtime renders without editor chrome', async ( { page } ) => {
	await page.goto( '/published/embed-home' );
	await expect( page.getByTestId( 'published-runtime' ) ).toBeVisible();
	await expect( page.getByRole( 'heading', { name: 'Embedded Builder Host' } ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: 'AI' } ) ).toHaveCount( 0 );
} );
