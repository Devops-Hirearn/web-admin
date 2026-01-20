'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOtp, verifyOtp } from '@/lib/api/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import Alert from '@/components/Alert';

export default function LoginPage() {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState('');
	const [otp, setOtp] = useState('');
	const [step, setStep] = useState<'phone' | 'otp'>('phone');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const digits = phoneNumber.replace(/\D/g, '');


			await sendOtp(digits);
			setStep('otp');
		} catch (err: any) {
			setError(err.responseMessage || err.message || 'Failed to send OTP');
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const digits = phoneNumber.replace(/\D/g, '');
			const response = await verifyOtp(digits, otp);

			// Check isAdmin from user object (backend returns isAdmin inside user)
			if (response.user?.isAdmin) {
				router.push('/admin/dashboard');
			} else {
				setError('Access denied. Admin privileges required.');
				const { logout } = await import('@/lib/api/auth');
				logout();
			}
		} catch (err: any) {
			setError(err.responseMessage || err.message || 'Invalid OTP');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
						<span className="text-3xl text-white">🔐</span>
					</div>
					<h2 className="text-4xl font-extrabold text-gray-900">
						Hirearn Admin
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Sign in to your admin account
					</p>
				</div>

				<div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
					{step === 'phone' ? (
						<form onSubmit={handleSendOtp} className="space-y-6">
							<div>
								<label htmlFor="phone" className="block text-sm font-medium text-gray-700">
									Phone Number
								</label>
								<input
									id="phone"
									type="tel"
									required
									value={phoneNumber}
									onChange={(e) => setPhoneNumber(e.target.value)}
									className="mt-1 appearance-none relative block w-full px-4 py-3 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-all"
									placeholder="Enter 10-digit phone number"
								/>
							</div>

							{error && (
								<Alert type="error" message={error} onClose={() => setError('')} />
							)}

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								{loading ? (
									<>
										<LoadingSpinner size="sm" />
										<span className="ml-2">Sending...</span>
									</>
								) : (
									'Send OTP'
								)}
							</button>
						</form>
					) : (
						<form onSubmit={handleVerifyOtp} className="space-y-6">
							<div>
								<label htmlFor="otp" className="block text-sm font-medium text-gray-700">
									Enter OTP
								</label>
								<input
									id="otp"
									type="text"
									required
									value={otp}
									onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
									className="mt-1 appearance-none relative block w-full px-4 py-3 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-all text-center text-2xl tracking-widest font-semibold"
									placeholder="000000"
									maxLength={6}
								/>
								<p className="mt-2 text-sm text-gray-500">
									OTP sent to {phoneNumber}
								</p>
							</div>

							{error && (
								<Alert type="error" message={error} onClose={() => setError('')} />
							)}

							<div className="flex space-x-4">
								<button
									type="button"
									onClick={() => {
										setStep('phone');
										setOtp('');
										setError('');
									}}
									className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
								>
									Back
								</button>
								<button
									type="submit"
									disabled={loading}
									className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
								>
									{loading ? (
										<>
											<LoadingSpinner size="sm" />
											<span className="ml-2">Verifying...</span>
										</>
									) : (
										'Verify OTP'
									)}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
