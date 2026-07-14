$body = @{
    name = "Danasari Ilaiah"
    phone = "9000000000"
    village = "Nehru Nagar"
    cropDetails = "Test crop"
    shopType = "TRADERS"
} | ConvertTo-Json

try {
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/farmers" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Output "RESPONSE:"
    $r | ConvertTo-Json -Depth 10
} catch {
    Write-Output "ERROR:"
    if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $sr.ReadToEnd()
    } else {
        Write-Output $_
    }
}
