import { test, expect } from '@playwright/test'

test.describe('Auth pages', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('login shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nobody@nowhere.invalid')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8000 })
  })

  test('signup page renders all fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/^email/i)).toBeVisible()
    await expect(page.getByLabel(/^password/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('signup shows validation for mismatched passwords', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/full name/i).fill('Test Coach')
    await page.getByLabel(/^email/i).fill('test@example.com')
    await page.getByLabel(/^password/i).fill('Password123!')
    await page.getByLabel(/confirm password/i).fill('Different123!')
    await page.getByRole('button', { name: /create account/i }).click()
    // Should stay on signup page with a validation message
    await expect(page).toHaveURL(/\/signup/)
  })

  test('signup shows validation for weak password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/full name/i).fill('Test Coach')
    await page.getByLabel(/^email/i).fill('test@example.com')
    await page.getByLabel(/^password/i).fill('weak')
    await page.getByLabel(/confirm password/i).fill('weak')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('verify-email page renders', async ({ page }) => {
    await page.goto('/verify-email')
    await expect(page.getByRole('heading', { name: /verify/i })).toBeVisible()
  })

  test('nav header shows sign in and sign up links when logged out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })
})
